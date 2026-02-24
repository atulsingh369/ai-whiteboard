"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";
import HistoryTab from "./HistoryTab";
import { FiPlusSquare, FiLoader, FiTrash2, FiClock } from "react-icons/fi";

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
  onRegisterSave?: (saveFn: () => void) => void;
};

export default function SceneManager({
  userId,
  onLoadScene,
  getCurrentScene,
  onRegisterSave,
}: SceneManagerProps) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [activeTab, setActiveTab] = useState<"scenes" | "history">("scenes");
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

  useEffect(() => {
    if (onRegisterSave) {
      onRegisterSave(() => {
        if (selectedSceneId) {
          void handleUpdateSelected();
        } else {
          void handleSaveNew();
        }
      });
    }
  });

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
    <div className="flex h-full flex-col bg-[#151922] text-slate-200">
      <div className="p-5 pb-3">
        <button
          type="button"
          onClick={handleSaveNew}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#3B82F6] py-3 text-sm font-bold text-white transition duration-150 hover:bg-blue-600"
        >
          <FiPlusSquare className="h-4 w-4" />
          New Project
        </button>
      </div>

      <div className="px-5 pb-4">
        <div className="flex p-1 space-x-1 rounded-xl bg-[#0F1115] border border-white/[0.06]">
          <button
            onClick={() => setActiveTab("scenes")}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition duration-150 ${
              activeTab === "scenes"
                ? "bg-[#1A1F29] text-[#E6E8EB] shadow-sm ring-1 ring-white/[0.06]"
                : "text-[#9CA3AF] hover:text-[#E6E8EB]"
            }`}
          >
            Scenes
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition duration-150 ${
              activeTab === "history"
                ? "bg-[#1A1F29] text-[#E6E8EB] shadow-sm ring-1 ring-white/[0.06]"
                : "text-[#9CA3AF] hover:text-[#E6E8EB]"
            }`}
          >
            History
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto p-4 custom-scrollbar">
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-lg bg-green-500/10 p-3 text-sm text-green-400 border border-green-500/20">
            {message}
          </div>
        )}

        {activeTab === "scenes" ? (
          <>
            <div className="mb-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Scene title..."
                className="w-full rounded-xl border border-white/[0.06] bg-[#0F1115] px-3 py-2 text-sm text-[#E6E8EB] placeholder:text-[#9CA3AF] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] transition duration-150"
              />
              {selectedSceneId && (
                <button
                  type="button"
                  onClick={handleUpdateSelected}
                  className="mt-2 w-full rounded-lg bg-[#1A1F29] border border-white/[0.06] px-3 py-2 text-xs font-semibold text-[#E6E8EB] shadow-sm transition duration-150 hover:bg-white/5"
                >
                  Update Selected Scene
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center p-8">
                <FiLoader className="animate-spin h-5 w-5 text-slate-500" />
              </div>
            ) : scenes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
                <p className="text-xs text-slate-500">No scenes saved yet.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {scenes.map((scene) => (
                  <li
                    key={scene.id}
                    className={`group relative rounded-xl border p-3 shadow-sm transition duration-150 cursor-pointer ${
                      selectedSceneId === scene.id
                        ? "border-white/[0.06] border-l-[3px] border-l-[#3B82F6] bg-[#1A1F29]"
                        : "border-white/[0.06] bg-[#1A1F29] hover:border-white/[0.12]"
                    }`}
                    onClick={() => handleLoad(scene)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col overflow-hidden">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`truncate text-xs ${selectedSceneId === scene.id ? "font-bold text-[#E6E8EB]" : "font-semibold text-[#9CA3AF]"}`}
                          >
                            {scene.title}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(scene.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition duration-150 rounded-md p-1.5 text-slate-500 hover:bg-red-500/20 hover:text-red-400"
                        title="Delete scene"
                      >
                        <FiTrash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="mt-2 text-[10px] text-[#6B7280] flex items-center gap-1.5">
                      <FiClock className="h-3 w-3" />
                      {new Date(scene.updated_at).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <HistoryTab />
        )}
      </div>

      <div className="p-4 border-t border-white/[0.06] bg-[#1A1F29] shrink-0">
        <div className="flex items-center justify-between rounded-xl bg-[#0F1115] p-2 border border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/20 text-[10px] font-bold text-[#9CA3AF]">
              P
            </div>
            <span className="text-xs font-semibold text-[#E6E8EB]">
              Pro Plan
            </span>
          </div>
          <button
            className="text-[10px] font-bold text-[#3B82F6] hover:text-[#2563EB] transition duration-150 px-2 py-1"
            onClick={() => alert("Pro plan coming soon! Stay tuned.")}
          >
            Upgrade
          </button>
        </div>
      </div>
    </div>
  );
}
