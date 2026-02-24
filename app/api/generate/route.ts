import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient, isAdminEmail } from "@/lib/auth";
import { buildExcalidrawElements } from "@/lib/diagramBuilder";
import { generateDiagramWithNim } from "@/lib/nimClient";

const generateRequestSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, "Prompt is required")
    .max(4000, "Prompt is too long"),
  model: z.string().trim().min(1).max(200).default("meta/llama3-70b-instruct"),
});

const isDev = process.env.NODE_ENV === "development";

export async function POST(request: Request) {
  const startedAt = Date.now();
  let userId: string | null = null;
  let prompt = "";
  let modelUsed = "meta/llama3-70b-instruct";
  let responseJson: unknown = null;

  const supabase = createSupabaseServerClient();

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = user.id;

    const allowed = await isAdminEmail(user.email);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawBody = await request.json().catch(() => null);
    const parsedBody = generateRequestSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: parsedBody.error.issues[0]?.message ?? "Invalid request",
        },
        { status: 400 },
      );
    }

    prompt = parsedBody.data.prompt;
    modelUsed = parsedBody.data.model;

    const {
      diagram,
      modelUsed: resolvedModel,
      diagnostics,
    } = await generateDiagramWithNim({
      prompt: parsedBody.data.prompt,
      model: parsedBody.data.model,
    });

    modelUsed = resolvedModel;

    const elements = buildExcalidrawElements(diagram);

    responseJson = {
      diagram,
      elements,
      diagnostics: isDev ? diagnostics : undefined,
    };

    // Warn if fallback was used
    if (diagnostics.usedFallback) {
      console.warn(
        "[API][generate] Diagram generation used fallback — empty diagram returned.",
        diagnostics,
      );
    }

    const result: Record<string, unknown> = { elements, diagram };

    // Include diagnostics in development for frontend debugging
    if (isDev) {
      result.diagnostics = diagnostics;
    }

    // If fallback was used and we got 0 nodes, signal it to the frontend
    if (diagnostics.usedFallback && diagram.nodes.length === 0) {
      result.warning =
        "The AI model returned output that could not be parsed into a valid diagram. An empty canvas was returned. Please try rephrasing your prompt.";
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate diagram.";
    console.error("[API][generate] Unhandled error:", message);

    responseJson = { error: message };

    const errorResponse: Record<string, unknown> = { error: message };
    if (isDev && error instanceof Error) {
      errorResponse.stack = error.stack;
    }

    return NextResponse.json(errorResponse, { status: 502 });
  } finally {
    if (userId) {
      const durationMs = Date.now() - startedAt;

      await supabase
        .from("ai_logs")
        .insert({
          user_id: userId,
          prompt,
          model_used: modelUsed,
          response_json: responseJson,
          duration_ms: durationMs,
        })
        .then(({ error: logError }) => {
          if (logError) {
            console.error(
              "[API][generate] Failed to insert ai_log:",
              logError.message,
            );
          }
        });
    }
  }
}
