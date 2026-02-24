import "server-only";

import { z } from "zod";
import { diagramSchema, type Diagram } from "@/types/diagram";

const NIM_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL = "meta/llama3-70b-instruct";

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
                text: z.string().optional()
              })
            )
          ])
        })
      })
    )
    .min(1)
});

function extractJsonFromText(rawText: string): string {
  const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1] ?? rawText;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model response did not include valid JSON.");
  }

  return candidate.slice(start, end + 1);
}

function getMessageContent(content: string | Array<{ type: string; text?: string }>): string {
  if (typeof content === "string") {
    return content;
  }

  return content
    .map((part) => (part.type === "text" ? part.text ?? "" : ""))
    .join("\n")
    .trim();
}

export async function generateDiagramWithNim(params: {
  prompt: string;
  model?: string;
}): Promise<{ diagram: Diagram; modelUsed: string }> {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_NIM_API_KEY is missing.");
  }

  const model = params.model?.trim() || DEFAULT_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch(NIM_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You generate STRICT JSON describing diagram nodes and connections. Only return JSON."
          },
          {
            role: "user",
            content: params.prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2000
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NIM request failed (${response.status}): ${errorText}`);
    }

    const rawResponse = await response.json();
    const parsedResponse = nimResponseSchema.safeParse(rawResponse);

    if (!parsedResponse.success) {
      throw new Error("Unexpected response shape from NVIDIA NIM.");
    }

    const content = getMessageContent(parsedResponse.data.choices[0].message.content);
    const jsonBlock = extractJsonFromText(content);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonBlock);
    } catch {
      throw new Error("Failed to parse JSON from model output.");
    }

    const diagramParsed = diagramSchema.safeParse(parsedJson);
    if (!diagramParsed.success) {
      throw new Error("Model returned invalid diagram schema.");
    }

    return {
      diagram: diagramParsed.data,
      modelUsed: model
    };
  } finally {
    clearTimeout(timeout);
  }
}
