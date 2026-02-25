"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useUIStore } from "@/stores/uiStore";

type CollapsibleSidebarProps = {
  side: "left" | "right";
  children: ReactNode;
};

export default function CollapsibleSidebar({
  side,
  children,
}: CollapsibleSidebarProps) {
  const isLeft = side === "left";

  const isOpen = useUIStore((s) =>
    isLeft ? s.leftSidebarOpen : s.rightPanelOpen,
  );
  const isPinned = useUIStore((s) =>
    isLeft ? s.leftSidebarPinned : s.rightPanelPinned,
  );
  const setOpen = useUIStore((s) =>
    isLeft ? s.setLeftSidebarOpen : s.setRightPanelOpen,
  );

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Escape key closes unpinned sidebars
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isPinned) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPinned, setOpen]);

  // Removed hover expanded behaviors per user request.

  const expandedWidth = isLeft ? "280px" : "360px";
  const borderClass = isLeft
    ? "border-r border-border-strong"
    : "border-l border-border-strong";

  const ToggleIcon = isLeft
    ? isOpen
      ? FiChevronLeft
      : FiChevronRight
    : isOpen
      ? FiChevronRight
      : FiChevronLeft;

  return (
    <>
      {/* Desktop Sidebar (Glassmorphic) */}
      <aside
        style={{
          width: isOpen ? expandedWidth : "0px",
          minWidth: isOpen ? expandedWidth : "0px",
        }}
        className={`
          hidden md:flex flex-col shrink-0 relative
          bg-surface-1 backdrop-blur-3xl ${borderClass}
          transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] z-30
        `}
      >
        {/* Unified Edge Toggle Button */}
        <button
          type="button"
          onClick={() => setOpen(!isOpen)}
          className={`
            absolute top-1/2 -translate-y-1/2 z-50 flex h-14 w-4 items-center justify-center 
            bg-surface-1 border border-border-strong backdrop-blur-xl
            text-txt-muted hover:text-white hover:bg-surface-2 transition duration-200 cursor-pointer
            ${isLeft ? "right-[-17px] rounded-r-md border-l-0" : "left-[-17px] rounded-l-md border-r-0"}
          `}
          title={isOpen ? `Close ${side} panel` : `Open ${side} panel`}
        >
          <ToggleIcon className="h-3 w-3" strokeWidth={3} />
        </button>

        {/* Inner Content Wrapper (hides content when width collapses) */}
        <div
          className="flex flex-col h-full overflow-hidden"
          style={{
            width: expandedWidth,
            opacity: isOpen ? 1 : 0,
            transition: "opacity 150ms ease, visibility 150ms ease",
            visibility: isOpen ? "visible" : "hidden",
          }}
        >
          {children}
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-surface-app/80 backdrop-blur-md z-40 md:hidden"
            onClick={() => setOpen(false)}
          />
          <aside
            className={`fixed inset-y-0 ${isLeft ? "left-0" : "right-0"} z-50 md:hidden bg-surface-1 backdrop-blur-3xl ${borderClass} flex flex-col`}
            style={{ width: expandedWidth }}
          >
            {children}
          </aside>
        </>
      )}
    </>
  );
}
