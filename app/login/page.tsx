"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { FiLock, FiEyeOff } from "react-icons/fi";

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
    <div className="relative flex min-h-screen flex-col bg-surface-app overflow-hidden">
      {/* Background radial bloon matching reference */}
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />

      <main className="relative z-10 flex flex-1">
        {/* Left Hero */}
        <div className="hidden lg:flex flex-1 flex-col justify-center pl-[12vw] pr-12 pb-12">
          <div className="max-w-[500px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 mb-8">
              <FiLock className="h-3 w-3 text-accent" />
              <span className="text-[11px] font-medium text-accent">
                Limited to selected users
              </span>
            </div>

            <h1 className="text-6xl xl:text-7xl font-extrabold tracking-tight text-white leading-[1.05] mb-6 shadow-sm">
              Architect the <br />
              <span className="text-accent drop-shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                Future
              </span>
            </h1>

            <p className="text-base text-[#9CA3AF] leading-relaxed mb-12 max-w-[420px]">
              Experience the next generation of technical whiteboarding powered
              by AI. Secure access for engineering teams building at scale.
            </p>

            {/* Feature Highlights Matching Reference */}
            <div className="w-full max-w-[420px] rounded-2xl border border-border-subtle bg-surface-1/40 backdrop-blur-md p-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 shadow-[0_0_12px_rgba(37,99,235,0.2)]">
                  <svg
                    className="h-5 w-5 text-accent"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-white mb-1">
                    AI-Powered Diagrams
                  </p>
                  <p className="text-[13px] text-[#9CA3AF]">
                    Generate architecture from text prompts
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2/50 border border-border-subtle shadow-sm cursor-default">
                  <FiLock className="h-5 w-5 text-[#D1D5DB]" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-white mb-1">
                    Enterprise Security
                  </p>
                  <p className="text-[13px] text-[#9CA3AF]">
                    SOC2 Compliant & SSO Ready
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Login Card Setup */}
        <div className="flex flex-1 items-center justify-center px-6 lg:justify-start lg:pl-16">
          <div className="w-full max-w-[420px]">
            <div className="rounded-2xl border border-border-subtle bg-[#111827] p-8 shadow-card-elevation relative">
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
                Private Beta Access
              </h2>
              <p className="text-sm text-[#9CA3AF] mb-8">
                Enter your credentials to access your workspace.
              </p>

              {error && (
                <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-5">
                {/* Simulated Email Password Inputs matching the design */}
                <div>
                  <label className="block text-[13px] font-medium text-[#E5E7EB] mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg
                        className="h-4 w-4 text-[#6B7280]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <input
                      type="email"
                      placeholder="name@company.com"
                      disabled
                      className="block w-full rounded-xl border border-border-subtle bg-[#0B0F19] py-2.5 pl-10 pr-3 text-sm text-white placeholder-[#6B7280] focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-80 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#E5E7EB] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiLock className="h-4 w-4 text-[#6B7280]" />
                    </div>
                    <input
                      type="password"
                      placeholder="••••••••"
                      disabled
                      className="block w-full rounded-xl border border-border-subtle bg-[#0B0F19] py-2.5 pl-10 pr-10 text-sm tracking-widest text-white placeholder-[#6B7280] focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-80 transition"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer">
                      <FiEyeOff className="h-4 w-4 text-[#6B7280] hover:text-[#9CA3AF] transition" />
                    </div>
                  </div>
                  <div className="mt-2 text-right">
                    <a
                      href="#"
                      className="text-[12px] font-medium text-accent hover:text-accent-hover transition"
                    >
                      Forgot password?
                    </a>
                  </div>
                </div>

                {/* Standard Sign In */}
                <button
                  type="button"
                  disabled={loading}
                  className="w-full mt-2 rounded-[12px] bg-accent py-3 text-[14px] font-bold text-white transition duration-150 hover:bg-accent-hover active:bg-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-[#111827] shadow-[0_4px_14px_0_rgba(37,99,235,0.39)]"
                >
                  Sign In
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border-subtle" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-semibold tracking-wider">
                    <span className="bg-[#111827] px-3 text-[#6B7280]">
                      Or continue with
                    </span>
                  </div>
                </div>

                {/* Google Sign In */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 rounded-[12px] border border-border-subtle bg-surface-2 py-2.5 text-[14px] font-semibold text-white transition duration-150 hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-white/10"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {loading ? "Redirecting..." : "Google"}
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-7">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border-subtle" />
                </div>
                <div className="relative flex justify-center text-[12px]">
                  <span className="bg-[#111827] px-3 text-[#6B7280]">
                    Don&apos;t have an account?
                  </span>
                </div>
              </div>

              {/* Request Access */}
              <button
                type="button"
                className="w-full rounded-[12px] border border-border-subtle bg-transparent py-2.5 text-[14px] font-semibold text-white transition duration-150 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-border-subtle"
              >
                Request Access
              </button>
            </div>

            {/* Footer */}
            <div className="mt-8 flex items-center justify-center gap-6 text-[11px] font-medium text-[#6B7280]">
              <span>© 2023 AI Whiteboard Inc.</span>
              <a href="#" className="hover:text-[#9CA3AF] transition">
                Privacy
              </a>
              <a href="#" className="hover:text-[#9CA3AF] transition">
                Terms
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
