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
import { useUIStore } from "@/stores/uiStore";

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
  const { syncState, setSyncState } = useUIStore();
  const lastElementsRef = useRef<unknown[]>([]);
  const isApplyingSceneRef = useRef(false);

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
      viewBackgroundColor: "transparent",
      collaborators: new Map(),
    };

    isApplyingSceneRef.current = true;
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

  const handleRegisterSave = useCallback((saveFn: () => void) => {
    saveToSupabaseRef.current = saveFn;
  }, []);

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
    <main className="flex h-[calc(100vh-56px)] w-full flex-col bg-surface-app font-sans text-txt-primary relative z-0">
      <input
        ref={loadJsonInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleJsonFileUpload}
      />

      {/* Zone 3 + Zone 4 — Canvas + Side Panels */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Floating Mode Toggle */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center rounded-2xl border border-border-strong bg-surface-1/90 backdrop-blur-xl p-1.5 shadow-card-elevation z-50">
          <button
            type="button"
            onClick={() => setViewMode("editor")}
            className={`rounded-xl px-6 py-2.5 text-[13px] font-bold tracking-wide transition-all duration-200 ${
              viewMode === "editor"
                ? "bg-accent text-white shadow-[0_0_15px_rgba(14,165,233,0.3)]"
                : "text-txt-secondary hover:text-txt-primary hover:bg-surface-3/50"
            }`}
          >
            Canvas
          </button>
          <button
            type="button"
            onClick={() => setViewMode("code")}
            className={`rounded-xl px-6 py-2.5 text-[13px] font-bold tracking-wide transition-all duration-200 ${
              viewMode === "code"
                ? "bg-accent text-white shadow-[0_0_15px_rgba(14,165,233,0.3)]"
                : "text-txt-secondary hover:text-txt-primary hover:bg-surface-3/50"
            }`}
          >
            Code
          </button>
        </div>
        {/* Left Sidebar (Zone 4) */}
        <CollapsibleSidebar side="left">
          <SceneManager
            userId={userId}
            onLoadScene={(scene) => applyScene(scene)}
            getCurrentScene={captureScene}
            onRegisterSave={handleRegisterSave}
          />
        </CollapsibleSidebar>

        {/* Canvas Area (Zone 3) — Excalidraw owns this space entirely */}
        <div className="relative flex-1 flex flex-col bg-surface-app min-w-0 overflow-hidden border-t border-border-subtle">
          {/* Luminous Engine Grid Background */}
          <div className="absolute inset-0 bg-luminous-grid bg-grid-24 opacity-60 pointer-events-none" />
          <div className="absolute inset-0 bg-vignette-radial pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-ai-glow pointer-events-none opacity-50 mix-blend-screen" />

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
                onChange={(elements: any, appState: any) => {
                  if (isApplyingSceneRef.current) {
                    isApplyingSceneRef.current = false;
                    lastElementsRef.current = elements;
                    return;
                  }

                  if (
                    syncState === "synced" &&
                    elements !== lastElementsRef.current
                  ) {
                    setSyncState("unsynced");
                  }
                  lastElementsRef.current = elements;
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
