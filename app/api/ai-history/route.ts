import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/auth";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("ai_logs")
    .select("id, prompt, model_used, created_at, response_json")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const history =
    data?.map((row) => {
      const sceneTitle = (row.response_json as Record<string, unknown>)
        ?.sceneTitle as string | undefined;
      return {
        id: row.id,
        prompt: row.prompt,
        model_used: row.model_used,
        created_at: row.created_at,
        sceneTitle: sceneTitle || null,
      };
    }) ?? [];

  return NextResponse.json({ history });
}
