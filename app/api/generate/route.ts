import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient, isAdminEmail } from "@/lib/auth";
import { buildExcalidrawElements } from "@/lib/diagramBuilder";
import { generateDiagramWithNim } from "@/lib/nimClient";

const generateRequestSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt is required").max(4000, "Prompt is too long"),
  model: z.string().trim().min(1).max(200).default("meta/llama3-70b-instruct")
});

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
      error: userError
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
          error: parsedBody.error.issues[0]?.message ?? "Invalid request"
        },
        { status: 400 }
      );
    }

    prompt = parsedBody.data.prompt;
    modelUsed = parsedBody.data.model;

    const { diagram, modelUsed: resolvedModel } = await generateDiagramWithNim({
      prompt: parsedBody.data.prompt,
      model: parsedBody.data.model
    });

    modelUsed = resolvedModel;

    const elements = buildExcalidrawElements(diagram);
    responseJson = {
      diagram,
      elements
    };

    return NextResponse.json({ elements, diagram }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate diagram.";
    responseJson = {
      error: message
    };

    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    if (userId) {
      const durationMs = Date.now() - startedAt;

      await supabase.from("ai_logs").insert({
        user_id: userId,
        prompt,
        model_used: modelUsed,
        response_json: responseJson,
        duration_ms: durationMs
      });
    }
  }
}
