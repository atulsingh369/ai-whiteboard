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
    <main className="flex h-screen w-full flex-col bg-[#F5F7FA] font-sans text-slate-900">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
        <div className="flex flex-1 items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 -ml-1.5 text-slate-500 hover:bg-slate-100 rounded-md"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-sm">
            A
          </div>
          <h1 className="text-sm font-semibold tracking-tight hidden sm:block">
            Archisign AI
          </h1>
        </div>

        <div className="hidden flex-1 items-center justify-center md:flex">
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button className="rounded-md bg-white px-4 py-1.5 text-xs font-semibold text-slate-800 shadow-sm blur-0">
              Editor
            </button>
            <button className="rounded-md px-4 py-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-900">
              Code View
            </button>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <button
            type="button"
            onClick={actions.exportPng}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
          >
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 string 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Export
          </button>
          <button
            type="button"
            onClick={actions.saveLocal}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-[0_2px_10px_rgba(37,99,235,0.2)] transition hover:bg-blue-700"
          >
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            Save
          </button>
          <div
            className="ml-2 h-8 w-8 rounded-full border border-orange-200 bg-orange-100 ring-2 ring-white cursor-pointer"
            title={userEmail}
          ></div>
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
          className={`${mobileMenuOpen ? "absolute inset-y-0 left-0 bg-[#FAFAFA]" : "hidden"} w-[280px] shrink-0 flex-col border-r border-slate-200 bg-[#FAFAFA] md:relative md:flex z-40 shadow-[4px_0_24px_-16px_rgba(0,0,0,0.05)]`}
        >
          <SceneManager
            userId={userId}
            onLoadScene={(scene) => {
              applyScene(scene);
              setMobileMenuOpen(false);
            }}
            getCurrentScene={captureScene}
          />
        </aside>

        {/* Backdrop for mobile */}
        {mobileMenuOpen && (
          <div
            className="absolute inset-0 bg-slate-900/20 z-30 md:hidden backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Center Canvas */}
        <div className="relative flex-1 bg-dot-pattern">
          <Excalidraw
            theme="light"
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

        {/* Right Sidebar - AIPanel */}
        <aside className="hidden w-[340px] shrink-0 border-l border-slate-200 bg-white lg:flex lg:flex-col z-10 shadow-[-4px_0_24px_-16px_rgba(0,0,0,0.05)]">
          <AIPanel onElementsGenerated={onGeneratedElements} />
        </aside>

        {/* Absolute floating AI panel on md screens */}
        <div className="hidden md:block lg:hidden absolute bottom-6 right-6 z-20 w-[340px] shadow-2xl rounded-xl border border-slate-200">
          <AIPanel onElementsGenerated={onGeneratedElements} />
        </div>
      </div>
    </main>
  );
}
