"use client";

import { useState, useRef } from "react";
import { FiLogOut, FiSettings } from "react-icons/fi";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";

type HeaderProps = {
  user?: {
    email: string;
  } | null;
};

export default function Header({ user }: HeaderProps) {
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(avatarMenuRef, () => {
    if (avatarMenuOpen) setAvatarMenuOpen(false);
  });

  const isLoggedIn = Boolean(user);

  return (
    <header className="relative z-50 flex h-12 shrink-0 items-center justify-between border-b border-border-subtle bg-surface-1/80 backdrop-blur-md px-4">
      {/* Left — Logo */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-6 w-6 items-center justify-center text-accent">
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-full h-full"
          >
            <circle cx="12" cy="12" r="4" />
            <circle cx="5" cy="8" r="2.5" />
            <circle cx="5" cy="16" r="2.5" />
            <circle cx="19" cy="8" r="2.5" />
            <circle cx="19" cy="16" r="2.5" />
            <path
              d="M7 9.5l3.5 1.5M7 14.5l3.5-1.5M17 9.5l-3.5 1.5M17 14.5l-3.5-1.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <span className="text-sm font-semibold tracking-tight text-txt-primary">
          AI Whiteboard
        </span>
      </div>

      {/* Center — Marketing nav (logged-out only) */}
      {!isLoggedIn && (
        <nav className="hidden md:flex items-center gap-8">
          {["Product", "Pricing", "Documentation"].map((item) => (
            <a
              key={item}
              href="#"
              className="text-[13px] font-medium text-txt-secondary hover:text-txt-primary transition duration-150"
            >
              {item}
            </a>
          ))}
        </nav>
      )}

      {/* Right — Controls */}
      <div className="flex items-center gap-3">
        {isLoggedIn ? (
          <>
            {/* Upgrade */}
            <a
              href="#"
              className="hidden sm:inline-flex rounded-md bg-accent/10 border border-accent/20 px-3 py-1 text-[11px] font-semibold text-accent transition duration-150 hover:bg-accent/20"
            >
              Upgrade
            </a>

            {/* Avatar */}
            <div className="relative" ref={avatarMenuRef}>
              <button
                type="button"
                onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                className="h-7 w-7 rounded-full border border-border-subtle bg-surface-2 cursor-pointer flex items-center justify-center text-[11px] font-bold text-txt-primary hover:bg-surface-3 transition duration-150"
                title={user?.email}
              >
                {user?.email?.charAt(0).toUpperCase()}
              </button>
              {avatarMenuOpen && (
                <div className="absolute right-0 top-9 w-48 rounded-lg border border-border-subtle bg-surface-2 p-1 shadow-card-elevation z-50">
                  <div className="px-3 py-2 border-b border-border-subtle mb-1">
                    <p className="text-xs font-semibold text-txt-primary truncate">
                      {user?.email}
                    </p>
                    <p className="text-[10px] text-txt-muted mt-0.5">Admin</p>
                  </div>
                  <a
                    href="/logout"
                    className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-txt-secondary hover:bg-surface-3 hover:text-txt-primary transition duration-150 w-full"
                  >
                    <FiLogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </a>
                </div>
              )}
            </div>
          </>
        ) : (
          <a
            href="/login"
            className="rounded-md bg-surface-2 border border-border-subtle px-4 py-1.5 text-xs font-semibold text-white transition duration-150 hover:bg-surface-3"
          >
            Contact Sales
          </a>
        )}
      </div>
    </header>
  );
}
