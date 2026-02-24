"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

function getErrorMessage(errorCode: string | null) {
  switch (errorCode) {
    case "not_admin":
      return "Access denied. Your email is not in the admins table.";
    case "oauth_error":
      return "Google OAuth sign-in failed. Try again.";
    default:
      return null;
  }
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setError(getErrorMessage(params.get("error")));
  }, []);

  async function handleGoogleLogin() {
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <h1 className="text-xl font-semibold text-white">AI Whiteboard </h1>
        <p className="mt-2 text-sm text-slate-300">
          Sign in with Google. Access is restricted to admin emails listed in
          Supabase.
        </p>

        {error ? (
          <p className="mt-4 rounded-md bg-red-950/70 p-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="mt-5 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Redirecting..." : "Continue with Google"}
        </button>
      </section>
    </main>
  );
}
