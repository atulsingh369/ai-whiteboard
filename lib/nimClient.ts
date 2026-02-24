import "server-only";

import { z } from "zod";
import { diagramSchema, type Diagram } from "@/types/diagram";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NIM_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL = "meta/llama-3.1-70b-instruct";

const SYSTEM_PROMPT = `You are a diagram generator. Your ONLY job is to return valid JSON.

RULES:
1. Return ONLY a single JSON object. Nothing else.
2. Do NOT include markdown fences, backticks, or explanation text.
3. Do NOT include comments inside the JSON.
4. The JSON MUST conform to this exact schema:

{
  "nodes": [
    { "id": "unique_string_id", "label": "Human Readable Label" }
  ],
  "edges": [
    { "from": "source_node_id", "to": "target_node_id" }
  ]
}

5. Every node must have a unique string "id" and a string "label".
6. Every edge must reference valid node ids in "from" and "to".
7. If you cannot generate a diagram, return: {"nodes":[],"edges":[]}
8. Do NOT wrap the output in any other structure.`;

// ---------------------------------------------------------------------------
// NIM response schema
// ---------------------------------------------------------------------------

const nimResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.union([
            z.string(),
            z.array(
              z.object({
                type: z.string(),
                text: z.string().optional(),
              }),
            ),
          ]),
        }),
      }),
    )
    .min(1),
});

// ---------------------------------------------------------------------------
// Lenient diagram schema for model output — coerces types and remaps keys
// ---------------------------------------------------------------------------

const lenientNodeSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    label: z
      .union([z.string(), z.number()])
      .transform(String)
      .optional()
      .default(""),
    // Common alternative key names the model might use
    name: z.union([z.string(), z.number()]).transform(String).optional(),
    text: z.union([z.string(), z.number()]).transform(String).optional(),
    title: z.union([z.string(), z.number()]).transform(String).optional(),
  })
  .passthrough()
  .transform((raw) => ({
    id: String(raw.id),
    label: raw.label || raw.name || raw.text || raw.title || String(raw.id),
  }));

const lenientEdgeSchema = z
  .object({
    from: z.union([z.string(), z.number()]).transform(String).optional(),
    to: z.union([z.string(), z.number()]).transform(String).optional(),
    // Common alternative key names
    source: z.union([z.string(), z.number()]).transform(String).optional(),
    target: z.union([z.string(), z.number()]).transform(String).optional(),
  })
  .passthrough()
  .transform((raw) => ({
    from: raw.from || raw.source || "",
    to: raw.to || raw.target || "",
  }));

const lenientDiagramSchema = z
  .object({
    nodes: z.array(lenientNodeSchema).default([]),
    edges: z.array(lenientEdgeSchema).default([]),
  })
  .passthrough()
  .transform((raw) => ({
    nodes: raw.nodes.filter((n) => n.id && n.label),
    edges: raw.edges.filter((e) => e.from && e.to),
  }));

// ---------------------------------------------------------------------------
// Diagnostic types
// ---------------------------------------------------------------------------

export type NimDiagnostics = {
  rawContent: string;
  extractedJson: string | null;
  parseError: string | null;
  validationError: string | null;
  repairApplied: string | null;
  usedFallback: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(stage: string, message: string, data?: unknown): void {
  const prefix = `[NIM][${stage}]`;
  if (data !== undefined) {
    console.log(
      prefix,
      message,
      typeof data === "string" ? data : JSON.stringify(data, null, 2),
    );
  } else {
    console.log(prefix, message);
  }
}

function logWarn(stage: string, message: string, data?: unknown): void {
  const prefix = `[NIM][${stage}]`;
  if (data !== undefined) {
    console.warn(
      prefix,
      message,
      typeof data === "string" ? data : JSON.stringify(data, null, 2),
    );
  } else {
    console.warn(prefix, message);
  }
}

function getMessageContent(
  content: string | Array<{ type: string; text?: string }>,
): string {
  if (typeof content === "string") {
    return content;
  }

  return content
    .map((part) => (part.type === "text" ? (part.text ?? "") : ""))
    .join("\n")
    .trim();
}

/**
 * Strip markdown code fences and extract the first plausible JSON object.
 * Handles:
 *   - ```json ... ``` blocks
 *   - Explanation text before/after JSON
 *   - Nested braces (simple brace-counting)
 */
function extractJsonFromText(rawText: string): string {
  // Step 1: strip code fences
  let text = rawText.replace(/```(?:json)?\s*([\s\S]*?)```/gi, "$1").trim();

  // Step 2: find the first `{` and its matching `}`
  const start = text.indexOf("{");
  if (start === -1) {
    throw new Error("No JSON object found in model response.");
  }

  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    if (text[i] === "}") depth--;
    if (depth === 0) {
      end = i;
      break;
    }
  }

  if (end === -1) {
    throw new Error("Unbalanced braces in model response.");
  }

  return text.slice(start, end + 1);
}

/**
 * Attempt to repair common JSON mistakes:
 *   - Trailing commas before } or ]
 *   - Single quotes instead of double quotes (simple cases)
 */
function repairJson(raw: string): { json: string; repair: string | null } {
  let repaired = raw;
  let repair: string | null = null;

  // Remove trailing commas: ,} or ,]
  const trailingCommaPattern = /,\s*([}\]])/g;
  if (trailingCommaPattern.test(repaired)) {
    repaired = repaired.replace(trailingCommaPattern, "$1");
    repair = "removed trailing commas";
  }

  return { json: repaired, repair };
}

/**
 * Attempt to parse a string that might be double-encoded JSON
 * (model returns a JSON string containing a stringified JSON).
 */
function tryUnwrapStringifiedJson(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function generateDiagramWithNim(params: {
  prompt: string;
  model?: string;
}): Promise<{
  diagram: Diagram;
  modelUsed: string;
  diagnostics: NimDiagnostics;
}> {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_NIM_API_KEY is missing.");
  }

  const model = params.model?.trim() || DEFAULT_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  const diagnostics: NimDiagnostics = {
    rawContent: "",
    extractedJson: null,
    parseError: null,
    validationError: null,
    repairApplied: null,
    usedFallback: false,
  };

  try {
    // -----------------------------------------------------------------------
    // 1. Call NIM
    // -----------------------------------------------------------------------
    log("CALL", `Sending request to ${model}`, {
      prompt: params.prompt.slice(0, 200),
    });

    const response = await fetch(NIM_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: params.prompt },
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      log("CALL", `NIM returned ${response.status}`, errorText);
      throw new Error(`NIM request failed (${response.status}): ${errorText}`);
    }

    // -----------------------------------------------------------------------
    // 2. Parse NIM envelope
    // -----------------------------------------------------------------------
    const rawResponse = await response.json();
    log("RESPONSE", "Raw NIM response received", rawResponse);

    const parsedResponse = nimResponseSchema.safeParse(rawResponse);
    if (!parsedResponse.success) {
      log(
        "RESPONSE",
        "Unexpected NIM response shape",
        parsedResponse.error.issues,
      );
      throw new Error("Unexpected response shape from NVIDIA NIM.");
    }

    // -----------------------------------------------------------------------
    // 3. Extract message content
    // -----------------------------------------------------------------------
    const content = getMessageContent(
      parsedResponse.data.choices[0].message.content,
    );
    diagnostics.rawContent = content;
    log(
      "CONTENT",
      `Extracted message content (${content.length} chars)`,
      content.slice(0, 500),
    );

    if (!content.trim()) {
      logWarn("CONTENT", "Model returned empty content string.");
      diagnostics.usedFallback = true;
      return {
        diagram: { nodes: [], edges: [] },
        modelUsed: model,
        diagnostics,
      };
    }

    // -----------------------------------------------------------------------
    // 4. Extract JSON from text
    // -----------------------------------------------------------------------
    let jsonBlock: string;
    try {
      jsonBlock = extractJsonFromText(content);
      diagnostics.extractedJson = jsonBlock;
      log("EXTRACT", `Extracted JSON block (${jsonBlock.length} chars)`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "JSON extraction failed.";
      logWarn("EXTRACT", msg, content);
      diagnostics.parseError = msg;
      diagnostics.usedFallback = true;
      return {
        diagram: { nodes: [], edges: [] },
        modelUsed: model,
        diagnostics,
      };
    }

    // -----------------------------------------------------------------------
    // 5. Parse JSON (with repair)
    // -----------------------------------------------------------------------
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonBlock);
    } catch {
      log("PARSE", "Initial JSON.parse failed, attempting repair...");
      const { json: repairedJson, repair } = repairJson(jsonBlock);
      diagnostics.repairApplied = repair;

      try {
        parsedJson = JSON.parse(repairedJson);
        log("PARSE", `Repair succeeded: ${repair}`);
      } catch (repairErr) {
        const msg =
          repairErr instanceof Error ? repairErr.message : "JSON parse failed.";
        logWarn("PARSE", `JSON parse failed even after repair`, {
          raw: jsonBlock.slice(0, 500),
          error: msg,
        });
        diagnostics.parseError = `JSON parse failed: ${msg}`;
        diagnostics.usedFallback = true;
        return {
          diagram: { nodes: [], edges: [] },
          modelUsed: model,
          diagnostics,
        };
      }
    }

    // Handle double-encoded JSON string
    parsedJson = tryUnwrapStringifiedJson(parsedJson);
    log("PARSE", "Parsed JSON object", parsedJson);

    // -----------------------------------------------------------------------
    // 6. Validate with lenient schema (coerce + remap)
    // -----------------------------------------------------------------------
    const lenientResult = lenientDiagramSchema.safeParse(parsedJson);
    if (lenientResult.success) {
      // Now validate against the strict schema to ensure downstream safety
      const strictResult = diagramSchema.safeParse(lenientResult.data);
      if (strictResult.success) {
        log(
          "VALIDATE",
          `Schema valid: ${strictResult.data.nodes.length} nodes, ${strictResult.data.edges.length} edges`,
        );
        return {
          diagram: strictResult.data,
          modelUsed: model,
          diagnostics,
        };
      }

      // Lenient passed but strict failed — still usable but log warning
      logWarn(
        "VALIDATE",
        "Strict schema failed after lenient coercion, using lenient result",
        strictResult.error.issues,
      );
      diagnostics.validationError = `Strict validation issues: ${strictResult.error.issues.map((i) => i.message).join("; ")}`;

      // Use the lenient data, force-cast (it's already close enough)
      const coerced = lenientResult.data as Diagram;
      return {
        diagram: coerced,
        modelUsed: model,
        diagnostics,
      };
    }

    // -----------------------------------------------------------------------
    // 7. Lenient schema also failed — try strict as last resort
    // -----------------------------------------------------------------------
    logWarn(
      "VALIDATE",
      "Lenient schema validation failed",
      lenientResult.error.issues,
    );

    const strictDirect = diagramSchema.safeParse(parsedJson);
    if (strictDirect.success) {
      log(
        "VALIDATE",
        "Strict schema passed directly (lenient was stricter due to transforms)",
      );
      return {
        diagram: strictDirect.data,
        modelUsed: model,
        diagnostics,
      };
    }

    // -----------------------------------------------------------------------
    // 8. Total failure — fallback to empty diagram
    // -----------------------------------------------------------------------
    const validationMsg = lenientResult.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    logWarn(
      "FALLBACK",
      `All validation failed. Issues: ${validationMsg}`,
      parsedJson,
    );
    diagnostics.validationError = validationMsg;
    diagnostics.usedFallback = true;

    return {
      diagram: { nodes: [], edges: [] },
      modelUsed: model,
      diagnostics,
    };
  } finally {
    clearTimeout(timeout);
  }
}
