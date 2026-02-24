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
import CollapsibleSidebar from "@/components/CollapsibleSidebar";
import { FiDownload, FiSave } from "react-icons/fi";
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
  const [viewMode, setViewMode] = useState<"editor" | "code">("editor");
  const saveToSupabaseRef = useRef<(() => void) | null>(null);

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
    <main className="flex h-screen w-full flex-col bg-surface-app font-sans text-txt-primary">
      <input
        ref={loadJsonInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleJsonFileUpload}
      />

      {/* Zone 2 — Workspace Toolbar (below header, above canvas) */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border-subtle bg-surface-1/60 backdrop-blur-sm px-4">
        {/* Left — View mode toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border-subtle bg-surface-app p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("editor")}
              className={`rounded-[4px] px-3 py-1 text-[11px] font-semibold transition duration-150 ${
                viewMode === "editor"
                  ? "bg-surface-2 text-txt-primary shadow-sm"
                  : "text-txt-secondary hover:text-txt-primary"
              }`}
            >
              Editor
            </button>
            <button
              type="button"
              onClick={() => setViewMode("code")}
              className={`rounded-[4px] px-3 py-1 text-[11px] font-semibold transition duration-150 ${
                viewMode === "code"
                  ? "bg-surface-2 text-txt-primary shadow-sm"
                  : "text-txt-secondary hover:text-txt-primary"
              }`}
            >
              Code View
            </button>
          </div>
        </div>

        {/* Right — Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={actions.exportPng}
            className="flex items-center gap-1.5 rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-txt-primary transition duration-150 hover:bg-surface-3"
          >
            <FiDownload className="h-3 w-3" />
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
            className="flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-[11px] font-semibold text-white transition duration-150 hover:bg-accent-hover"
          >
            <FiSave className="h-3 w-3" />
            Save
          </button>
        </div>
      </div>

      {/* Zone 3 + Zone 4 — Canvas + Side Panels */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar (Zone 4) */}
        <CollapsibleSidebar side="left">
          <SceneManager
            userId={userId}
            onLoadScene={(scene) => applyScene(scene)}
            getCurrentScene={captureScene}
            onRegisterSave={(saveFn) => {
              saveToSupabaseRef.current = saveFn;
            }}
          />
        </CollapsibleSidebar>

        {/* Canvas Area (Zone 3) — Excalidraw owns this space entirely */}
        <div className="relative flex-1 flex flex-col bg-surface-app min-w-0 overflow-hidden">
          <div className="absolute inset-0 bg-dot-pattern mix-blend-overlay pointer-events-none" />
          <div className="absolute inset-0 bg-canvas-glow pointer-events-none" />

          <div className="relative flex-1">
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
              <div className="h-full overflow-auto p-6 bg-surface-app">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-txt-primary">
                    Scene JSON
                  </h2>
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
                    className="rounded-md border border-border-subtle bg-surface-2 px-3 py-1.5 text-xs font-semibold text-txt-primary hover:bg-surface-3 transition duration-150"
                  >
                    Copy to Clipboard
                  </button>
                </div>
                <pre className="text-xs text-txt-secondary font-mono bg-surface-1 border border-border-subtle rounded-xl p-4 overflow-auto max-h-[calc(100vh-180px)] whitespace-pre-wrap break-words">
                  {JSON.stringify(
                    captureScene() ?? { elements: [], appState: {}, files: {} },
                    null,
                    2,
                  )}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel — AI Architect (Zone 4) */}
        <CollapsibleSidebar side="right">
          <AIPanel onElementsGenerated={onGeneratedElements} />
        </CollapsibleSidebar>
      </div>
    </main>
  );
}
