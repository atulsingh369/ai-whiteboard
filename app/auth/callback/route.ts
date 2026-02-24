import { NextResponse } from "next/server";
import { createSupabaseServerClient, isAdminEmail } from "@/lib/auth";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth_error", requestUrl.origin));
  }

  const supabase = createSupabaseServerClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(new URL("/login?error=oauth_error", requestUrl.origin));
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.email) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=oauth_error", requestUrl.origin));
  }

  const allowed = await isAdminEmail(user.email);
  if (!allowed) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=not_admin", requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
