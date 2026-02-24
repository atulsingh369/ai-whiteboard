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

  const handleMouseEnter = () => {
    if (isPinned) return;
    hoverTimerRef.current = setTimeout(() => {
      setOpen(true);
    }, 100);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (!isPinned) {
      setOpen(false);
    }
  };

  const expandedWidth = isLeft ? "280px" : "360px";
  const borderClass = isLeft
    ? "border-r border-border-subtle"
    : "border-l border-border-subtle";

  const CollapseIcon = isLeft ? FiChevronLeft : FiChevronRight;
  const ExpandIcon = isLeft ? FiChevronRight : FiChevronLeft;

  return (
    <>
      {/* Collapsed state — small expand button on the edge */}

      <div
        className={`hidden md:flex shrink-0 items-center ${isLeft ? "" : ""}`}
      >
        <button
          type="button"
          onClick={() => setOpen(!isOpen)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="flex h-7 w-7 items-center justify-center bg-surface-1 border border-border-subtle text-txt-muted hover:text-txt-primary hover:bg-surface-2 transition duration-150 rounded-sm"
          title={
            isLeft
              ? isOpen
                ? "Close left panel"
                : "Open left panel"
              : isOpen
                ? "Close right panel"
                : "Open right panel"
          }
        >
          {isOpen ? (
            <CollapseIcon className="h-7 w-7 text-xl text-white cursor-pointer" />
          ) : (
            <ExpandIcon className="h-7 w-7 text-xl text-white cursor-pointer" />
          )}
        </button>
      </div>

      {/* Open state — sidebar panel with collapse handle */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          width: isOpen ? expandedWidth : "0px",
          minWidth: isOpen ? expandedWidth : "0px",
        }}
        className={`
          hidden md:flex flex-col shrink-0 overflow-hidden relative
          bg-surface-1 ${borderClass}
          transition-all duration-200 ease-in-out
        `}
      >
        <div
          className="flex flex-col h-full"
          style={{
            width: expandedWidth,
            opacity: isOpen ? 1 : 0,
            transition: "opacity 150ms ease",
          }}
        >
          {children}
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-surface-app/80 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setOpen(false)}
          />
          <aside
            className={`fixed inset-y-0 ${isLeft ? "left-0" : "right-0"} z-50 md:hidden bg-surface-1 ${borderClass} flex flex-col`}
            style={{ width: expandedWidth }}
          >
            {children}
          </aside>
        </>
      )}
    </>
  );
}
