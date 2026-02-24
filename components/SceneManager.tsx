"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";

type ScenePayload = {
  elements: unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
};

type SceneRow = {
  id: string;
  title: string;
  scene_json: ScenePayload;
  created_at: string;
  updated_at: string;
};

type SceneManagerProps = {
  userId: string;
  onLoadScene: (scene: ScenePayload) => void;
  getCurrentScene: () => ScenePayload | null;
};

export default function SceneManager({
  userId,
  onLoadScene,
  getCurrentScene,
}: SceneManagerProps) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [title, setTitle] = useState("Untitled Scene");
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [scenes, setScenes] = useState<SceneRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadScenes = useCallback(async () => {
    if (!supabase) {
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: loadError } = await supabase
      .from("scenes")
      .select("id, title, scene_json, created_at, updated_at")
      .order("updated_at", { ascending: false });

    if (loadError) {
      setError(loadError.message);
      setLoading(false);
      return;
    }

    setScenes((data as SceneRow[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    setSupabase(createSupabaseBrowserClient());
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    void loadScenes();
  }, [loadScenes, supabase]);

  async function handleSaveNew() {
    setError(null);
    setMessage(null);

    if (!supabase) {
      setError("Supabase client unavailable.");
      return;
    }

    const scene = getCurrentScene();
    if (!scene) {
      setError("Canvas not ready yet.");
      return;
    }

    const trimmedTitle = title.trim() || "Untitled Scene";
    const { data, error: saveError } = await supabase
      .from("scenes")
      .insert({
        user_id: userId,
        title: trimmedTitle,
        scene_json: scene,
      })
      .select("id, title, scene_json, created_at, updated_at")
      .single();

    if (saveError) {
      setError(saveError.message);
      return;
    }

    const row = data as SceneRow;
    setScenes((previous) => [row, ...previous]);
    setSelectedSceneId(row.id);
    setTitle(row.title);
    setMessage("Saved to Supabase.");
  }

  async function handleUpdateSelected() {
    setError(null);
    setMessage(null);

    if (!supabase) {
      setError("Supabase client unavailable.");
      return;
    }

    if (!selectedSceneId) {
      setError("Select a scene to update.");
      return;
    }

    const scene = getCurrentScene();
    if (!scene) {
      setError("Canvas not ready yet.");
      return;
    }

    const trimmedTitle = title.trim() || "Untitled Scene";
    const { data, error: updateError } = await supabase
      .from("scenes")
      .update({
        title: trimmedTitle,
        scene_json: scene,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedSceneId)
      .eq("user_id", userId)
      .select("id, title, scene_json, created_at, updated_at")
      .single();

    if (updateError) {
      setError(updateError.message);
      return;
    }

    const updated = data as SceneRow;
    setScenes((previous) => [
      updated,
      ...previous.filter((item) => item.id !== updated.id),
    ]);
    setMessage("Scene updated.");
  }

  async function handleDelete(id: string) {
    setError(null);
    setMessage(null);

    if (!supabase) {
      setError("Supabase client unavailable.");
      return;
    }

    const { error: deleteError } = await supabase
      .from("scenes")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setScenes((previous) => previous.filter((item) => item.id !== id));

    if (selectedSceneId === id) {
      setSelectedSceneId(null);
      setTitle("Untitled Scene");
    }

    setMessage("Scene deleted.");
  }

  function handleLoad(row: SceneRow) {
    setSelectedSceneId(row.id);
    setTitle(row.title);
    onLoadScene(row.scene_json);
    setMessage(`Loaded: ${row.title}`);
    setError(null);
  }

  return (
    <div className="flex h-full flex-col bg-[#FAFAFA] text-slate-800">
      <div className="p-4 space-y-4 border-b border-slate-200">
        <h2 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
          Library
        </h2>

        <div className="space-y-1">
          <button className="w-full flex items-center justify-between rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm font-semibold text-blue-600 shadow-sm">
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
              All Scenes
            </span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700">
              {scenes.length}
            </span>
          </button>
        </div>

        <div className="pt-2">
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Name your scene..."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleSaveNew}
              className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Save New
            </button>
            <button
              type="button"
              onClick={handleUpdateSelected}
              disabled={!selectedSceneId}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Update
            </button>
          </div>
          {error ? (
            <p className="mt-2 text-[11px] font-medium text-red-500">{error}</p>
          ) : null}
          {message ? (
            <p className="mt-2 text-[11px] font-medium text-emerald-600">
              {message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="mb-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
          Recent Projects
        </h2>

        {loading ? (
          <div className="flex py-8 justify-center">
            <svg
              className="animate-spin h-5 w-5 text-slate-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        ) : scenes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
            <p className="text-xs text-slate-500">No scenes saved yet.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {scenes.map((scene) => (
              <li
                key={scene.id}
                className="group relative rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-300 hover:shadow-md cursor-pointer"
                onClick={() => handleLoad(scene)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div
                      className={`h-2 w-2 shrink-0 rounded-full ${selectedSceneId === scene.id ? "bg-blue-500" : "bg-slate-300"}`}
                    ></div>
                    <span
                      className={`truncate text-sm ${selectedSceneId === scene.id ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}
                    >
                      {scene.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(scene.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    title="Delete scene"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
                <p className="mt-1.5 ml-4 pl-0.5 text-[10px] text-slate-400">
                  {new Date(scene.updated_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2 border border-slate-200">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-[10px] font-bold text-indigo-700">
              P
            </div>
            <span className="text-xs font-semibold text-slate-700">
              Pro Plan
            </span>
          </div>
          <button className="text-[10px] font-bold text-blue-600 hover:text-blue-700 px-2 py-1">
            Upgrade
          </button>
        </div>
      </div>
    </div>
  );
}
