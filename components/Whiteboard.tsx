"use client";

import dynamic from "next/dynamic";
import {
  type ChangeEvent,
  type ComponentType,
  useCallback,
  useMemo,
  useRef,
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

    api.updateScene({
      elements: scene.elements,
      appState: scene.appState,
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
    <main className="h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        <div>
          <h1 className="text-lg font-semibold">AI Whiteboard (Personal)</h1>
          <p className="text-xs text-slate-400">Logged in as {userEmail}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={actions.saveLocal}
            className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-semibold hover:bg-slate-600"
          >
            Save Locally
          </button>
          <button
            type="button"
            onClick={actions.loadLocal}
            className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-semibold hover:bg-slate-600"
          >
            Load Local
          </button>
          <button
            type="button"
            onClick={actions.exportJson}
            className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-semibold hover:bg-slate-600"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={actions.triggerJsonImport}
            className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-semibold hover:bg-slate-600"
          >
            Load JSON
          </button>
          <a
            href="/logout"
            className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold hover:bg-red-600"
          >
            Sign out
          </a>
        </div>
      </header>

      <input
        ref={loadJsonInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleJsonFileUpload}
      />

      <div className="relative h-[calc(100vh-53px)]">
        <div className="absolute left-4 top-4 z-20 w-[360px]">
          <SceneManager
            userId={userId}
            onLoadScene={applyScene}
            getCurrentScene={captureScene}
          />
        </div>

        <Excalidraw
          theme="dark"
          excalidrawAPI={(api: unknown) => {
            apiRef.current = api as ExcalidrawAPI;
          }}
          UIOptions={{
            canvasActions: {
              loadScene: true,
              saveAsImage: true,
              export: { saveFileToDisk: true },
              clearCanvas: true,
              toggleTheme: true,
            },
          }}
        />

        <AIPanel onElementsGenerated={onGeneratedElements} />
      </div>
    </main>
  );
}
