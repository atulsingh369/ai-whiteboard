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

export default function SceneManager({ userId, onLoadScene, getCurrentScene }: SceneManagerProps) {
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
        scene_json: scene
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
        updated_at: new Date().toISOString()
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
    setScenes((previous) => [updated, ...previous.filter((item) => item.id !== updated.id)]);
    setMessage("Scene updated.");
  }

  async function handleDelete(id: string) {
    setError(null);
    setMessage(null);

    if (!supabase) {
      setError("Supabase client unavailable.");
      return;
    }

    const { error: deleteError } = await supabase.from("scenes").delete().eq("id", id).eq("user_id", userId);

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
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Scenes (Supabase)</h2>

      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Scene title"
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
        />
        <button
          type="button"
          onClick={handleSaveNew}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
        >
          Save
        </button>
        <button
          type="button"
          onClick={handleUpdateSelected}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Update
        </button>
      </div>

      {error ? <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p> : null}
      {message ? <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">{message}</p> : null}

      <div className="mt-3 max-h-44 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700">
        {loading ? (
          <p className="p-2 text-xs text-slate-500 dark:text-slate-400">Loading scenes...</p>
        ) : scenes.length === 0 ? (
          <p className="p-2 text-xs text-slate-500 dark:text-slate-400">No scenes saved yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {scenes.map((scene) => (
              <li key={scene.id} className="flex items-center justify-between gap-2 p-2">
                <button
                  type="button"
                  onClick={() => handleLoad(scene)}
                  className={`truncate text-left text-xs ${
                    selectedSceneId === scene.id
                      ? "font-semibold text-blue-600 dark:text-blue-400"
                      : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {scene.title}
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(scene.id)}
                  className="rounded border border-red-300 px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
