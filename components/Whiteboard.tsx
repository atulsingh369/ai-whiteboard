"use client";

import dynamic from "next/dynamic";
import {
  type ChangeEvent,
  type ComponentType,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { z } from "zod";
import AIPanel from "@/components/AIPanel";
import SceneManager from "@/components/SceneManager";
import { FiMenu, FiDownload, FiSave, FiLogOut } from "react-icons/fi";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import type { ExcalidrawElementLike } from "@/types/diagram";

const Excalidraw = dynamic(
  async () => {
    const mod = await import("@excalidraw/excalidraw");
    return mod.Excalidraw as ComponentType<Record<string, unknown>>;
  },
  { ssr: false },
);

type ExcalidrawAPI = {
  getSceneElementsIncludingDeleted: () => unknown[];
  getAppState: () => Record<string, unknown>;
  getFiles: () => Record<string, unknown>;
  updateScene: (scene: {
    elements?: unknown[];
    appState?: Record<string, unknown>;
    files?: Record<string, unknown>;
    commitToHistory?: boolean;
  }) => void;
};

type ScenePayload = {
  elements: unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
};

type WhiteboardProps = {
  userId: string;
  userEmail: string;
};

const LOCAL_STORAGE_SCENE_KEY = "ai-whiteboard.personal.scene";

const scenePayloadSchema = z.object({
  elements: z.array(z.unknown()),
  appState: z.record(z.unknown()),
  files: z.record(z.unknown()),
});

export default function Whiteboard({ userId, userEmail }: WhiteboardProps) {
  const apiRef = useRef<ExcalidrawAPI | null>(null);
  const loadJsonInputRef = useRef<HTMLInputElement | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"editor" | "code">("editor");
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const saveToSupabaseRef = useRef<(() => void) | null>(null);

  useOnClickOutside(avatarMenuRef, () => {
    if (avatarMenuOpen) setAvatarMenuOpen(false);
  });

  const captureScene = useCallback((): ScenePayload | null => {
    const api = apiRef.current;
    if (!api) {
      return null;
    }

    return {
      elements: api.getSceneElementsIncludingDeleted(),
      appState: api.getAppState(),
      files: api.getFiles(),
    };
  }, []);

  const applyScene = useCallback((scene: ScenePayload) => {
    const api = apiRef.current;
    if (!api) {
      return;
    }

    // Safely reconstruct appState to prevent "collaborators.forEach is not a function"
    // Since Excalidraw uses a Map() for collaborators, but JSON.stringify converts it to an empty Object {}.
    const safeAppState = {
      ...scene.appState,
      collaborators: new Map(),
    };

    api.updateScene({
      elements: scene.elements,
      appState: safeAppState,
      files: scene.files,
      commitToHistory: true,
    });
  }, []);

  const onGeneratedElements = useCallback(
    (elements: ExcalidrawElementLike[]) => {
      const api = apiRef.current;
      if (!api) {
        return;
      }

      const current = api.getSceneElementsIncludingDeleted();
      api.updateScene({
        elements: [...current, ...elements],
        commitToHistory: true,
      });
    },
    [],
  );

  const actions = useMemo(
    () => ({
      saveLocal: () => {
        const scene = captureScene();
        if (!scene) {
          alert("Canvas is not ready yet.");
          return;
        }

        localStorage.setItem(LOCAL_STORAGE_SCENE_KEY, JSON.stringify(scene));
        alert("Scene saved locally.");
      },
      loadLocal: () => {
        const raw = localStorage.getItem(LOCAL_STORAGE_SCENE_KEY);
        if (!raw) {
          alert("No local scene found.");
          return;
        }

        try {
          const parsed = scenePayloadSchema.parse(JSON.parse(raw));
          applyScene(parsed);
        } catch {
          alert("Local scene is invalid.");
        }
      },
      exportJson: () => {
        const scene = captureScene();
        if (!scene) {
          alert("Canvas is not ready yet.");
          return;
        }

        const blob = new Blob([JSON.stringify(scene, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `scene-${Date.now()}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      triggerJsonImport: () => {
        loadJsonInputRef.current?.click();
      },
      exportPng: async () => {
        const api = apiRef.current;
        if (!api) {
          alert("Canvas is not ready yet.");
          return;
        }

        try {
          const { exportToBlob } = await import("@excalidraw/excalidraw");
          const allElements = api.getSceneElementsIncludingDeleted() as Array<
            Record<string, unknown>
          >;
          const elements = allElements.filter((el) => !el.isDeleted);

          if (elements.length === 0) {
            alert("Nothing to export — the canvas is empty.");
            return;
          }

          const blob = await (exportToBlob as Function)({
            elements,
            appState: {
              ...api.getAppState(),
              exportWithDarkMode: true,
              exportBackground: true,
            },
            files: api.getFiles(),
            mimeType: "image/png",
            quality: 1,
          });

          const url = URL.createObjectURL(blob as Blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = `whiteboard-${Date.now()}.png`;
          anchor.click();
          URL.revokeObjectURL(url);
        } catch (err) {
          console.error("PNG export failed:", err);
          alert("Failed to export PNG. Check the console for details.");
        }
      },
    }),
    [applyScene, captureScene],
  );

  async function handleJsonFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = scenePayloadSchema.parse(JSON.parse(text));
      applyScene(parsed);
    } catch {
      alert("Invalid scene JSON file.");
    }
  }

  return (
    <main className="flex h-screen w-full flex-col bg-[#0F1115] font-sans text-[#E6E8EB]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#1A1F29] px-4">
        <div className="flex flex-1 items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 -ml-1.5 text-slate-400 hover:bg-white/5 hover:text-[#E6E8EB] rounded-md transition duration-150"
          >
            <FiMenu className="h-5 w-5" />
          </button>
        </div>

        <div className="hidden flex-1 items-center justify-center md:flex">
          <div className="flex items-center rounded-lg border border-white/[0.06] bg-[#0F1115] p-1">
            <button
              type="button"
              onClick={() => setViewMode("editor")}
              className={`rounded-md px-4 py-1.5 text-xs font-semibold transition duration-150 border ${
                viewMode === "editor"
                  ? "bg-[#1A1F29] text-[#E6E8EB] border-white/[0.06]"
                  : "border-transparent text-[#9CA3AF] hover:text-[#E6E8EB]"
              }`}
            >
              Editor
            </button>
            <button
              type="button"
              onClick={() => setViewMode("code")}
              className={`rounded-md px-4 py-1.5 text-xs font-medium transition duration-150 border ${
                viewMode === "code"
                  ? "bg-[#1A1F29] text-[#E6E8EB] border-white/[0.06]"
                  : "border-transparent text-[#9CA3AF] hover:text-[#E6E8EB]"
              }`}
            >
              Code View
            </button>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <button
            type="button"
            onClick={actions.exportPng}
            className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-[#1A1F29] px-4 py-1.5 text-xs font-semibold text-[#E6E8EB] transition duration-150 hover:bg-white/5"
          >
            <FiDownload className="h-4 w-4" />
            Export
          </button>
          <button
            type="button"
            onClick={() => {
              if (saveToSupabaseRef.current) {
                saveToSupabaseRef.current();
              } else {
                actions.saveLocal();
              }
            }}
            className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-1.5 text-xs font-semibold text-white transition duration-150 hover:bg-blue-600"
          >
            <FiSave className="h-4 w-4" />
            Save
          </button>
          <div className="relative ml-2" ref={avatarMenuRef}>
            <button
              type="button"
              onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
              className="h-8 w-8 rounded-full border border-white/[0.06] bg-[#151922] cursor-pointer flex items-center justify-center text-xs font-bold text-[#E6E8EB] hover:bg-[#1A1F29] transition duration-150"
              title={userEmail}
            >
              {userEmail?.charAt(0).toUpperCase()}
            </button>
            {avatarMenuOpen && (
              <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border border-white/[0.06] bg-[#1A1F29] p-2">
                <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                  <p className="text-xs font-semibold text-[#E6E8EB] truncate">
                    {userEmail}
                  </p>
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5">Admin</p>
                </div>
                <a
                  href="/logout"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[#9CA3AF] hover:bg-white/5 hover:text-[#E6E8EB] transition duration-150 w-full"
                >
                  <FiLogOut className="h-4 w-4" />
                  Sign Out
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      <input
        ref={loadJsonInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleJsonFileUpload}
      />

      <div className="flex flex-1 items-stretch overflow-hidden relative">
        {/* Left Sidebar - SceneManager */}
        <aside
          className={`${mobileMenuOpen ? "absolute inset-y-0 left-0 bg-[#151922]" : "hidden"} w-80 shrink-0 flex-col border-r border-white/[0.06] bg-[#151922] md:relative md:flex z-40`}
        >
          <SceneManager
            userId={userId}
            onLoadScene={(scene) => {
              applyScene(scene);
              setMobileMenuOpen(false);
            }}
            getCurrentScene={captureScene}
            onRegisterSave={(saveFn) => {
              saveToSupabaseRef.current = saveFn;
            }}
          />
        </aside>

        {/* Backdrop for mobile */}
        {mobileMenuOpen && (
          <div
            className="absolute inset-0 bg-[#0F1115]/80 z-30 md:hidden backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Center Canvas */}
        <div className="relative flex-1 bg-dot-pattern">
          {/* Always-mounted Excalidraw — toggled via CSS to preserve state */}
          <div className={viewMode === "editor" ? "h-full w-full" : "hidden"}>
            <Excalidraw
              theme="dark"
              excalidrawAPI={(api: any) => {
                if (api) {
                  // @ts-ignore
                  apiRef.current = api;
                }
              }}
              UIOptions={{
                canvasActions: {
                  loadScene: true,
                  saveAsImage: true,
                  export: { saveFileToDisk: true },
                  clearCanvas: true,
                  toggleTheme: false,
                },
              }}
            />
          </div>

          {/* Always-mounted Code View — toggled via CSS */}
          <div className={viewMode === "code" ? "h-full" : "hidden"}>
            <div className="h-full overflow-auto p-6 bg-[#0F1115]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-[#E6E8EB]">Scene JSON</h2>
                <button
                  type="button"
                  onClick={() => {
                    const scene = captureScene();
                    if (scene) {
                      navigator.clipboard.writeText(
                        JSON.stringify(scene, null, 2),
                      );
                    }
                  }}
                  className="rounded-lg border border-white/[0.06] bg-[#1A1F29] px-3 py-1.5 text-xs font-semibold text-[#E6E8EB] hover:bg-white/5 transition duration-150"
                >
                  Copy to Clipboard
                </button>
              </div>
              <pre className="text-xs text-[#9CA3AF] font-mono bg-[#151922] border border-white/[0.06] rounded-xl p-4 overflow-auto max-h-[calc(100vh-180px)] whitespace-pre-wrap break-words">
                {JSON.stringify(
                  captureScene() ?? { elements: [], appState: {}, files: {} },
                  null,
                  2,
                )}
              </pre>
            </div>
          </div>
        </div>

        {/* Right Sidebar - AIPanel */}
        <aside className="hidden w-[340px] shrink-0 border-l border-white/[0.06] bg-[#1A1F29] lg:flex lg:flex-col z-10">
          <AIPanel onElementsGenerated={onGeneratedElements} />
        </aside>

        {/* Absolute floating AI panel on md screens */}
        <div className="hidden md:block lg:hidden absolute bottom-6 right-6 z-20 w-[340px] rounded-xl border border-white/[0.06] overflow-hidden bg-[#1A1F29] shadow-2xl">
          <AIPanel onElementsGenerated={onGeneratedElements} />
        </div>
      </div>
    </main>
  );
}
