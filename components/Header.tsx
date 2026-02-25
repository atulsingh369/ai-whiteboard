"use client";

import { useState, useRef } from "react";
import { FiLogOut, FiCloud, FiCloudOff, FiRefreshCw } from "react-icons/fi";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { useUIStore } from "@/stores/uiStore";

type HeaderProps = {
  user?: {
    email: string;
  } | null;
};

export default function Header({ user }: HeaderProps) {
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  const { activeSceneTitle, setActiveSceneTitle, syncState } = useUIStore();

  useOnClickOutside(avatarMenuRef, () => {
    if (avatarMenuOpen) setAvatarMenuOpen(false);
  });

  const isLoggedIn = Boolean(user);

  return (
    <header className="relative z-50 flex h-14 shrink-0 items-center justify-between bg-surface-app px-6">
      {/* Left — Logo & Title */}
      <div className="flex items-center gap-3">
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

        <span className="text-sm font-semibold tracking-tight text-txt-primary hidden sm:inline-block">
          AI Whiteboard
        </span>

        {activeSceneTitle !== null && (
          <>
            <span className="text-border-strong hidden sm:inline-block">/</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={activeSceneTitle}
                onChange={(e) => setActiveSceneTitle(e.target.value)}
                className="bg-transparent border-none text-[13px] font-semibold text-txt-primary focus:outline-none focus:ring-0 max-w-[200px] truncate hover:text-accent transition duration-150"
                placeholder="Untitled Project"
              />
              <div className="h-4 w-px bg-border-strong mx-1" />
              <div className="flex items-center justify-center">
                {syncState === "synced" && (
                  <div
                    title="Document synced"
                    className="text-txt-muted p-1 rounded-md hover:bg-surface-3 transition"
                  >
                    <FiCloud className="h-4 w-4" />
                  </div>
                )}
                {syncState === "unsynced" && (
                  <button
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(new CustomEvent("triggerCloudSync"))
                    }
                    title="Document has unsaved changes. Click to sync."
                    className="text-txt-primary p-1 rounded-md hover:bg-surface-3 hover:text-accent transition bg-surface-2 border border-border-subtle shadow-sm"
                  >
                    <FiCloudOff className="h-4 w-4" />
                  </button>
                )}
                {syncState === "saving" && (
                  <div title="Saving..." className="text-accent p-1 rounded-md">
                    <FiRefreshCw className="h-4 w-4 animate-spin" />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

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
