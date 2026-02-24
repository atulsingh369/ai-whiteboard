"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";
import HistoryTab from "./HistoryTab";
import { FiPlusSquare, FiLoader } from "react-icons/fi";
import SegmentedTabs from "./sidebar/SegmentedTabs";
import ActiveSceneCard from "./sidebar/ActiveSceneCard";
import SceneListItem from "./sidebar/SceneListItem";

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
    <div className="flex h-full flex-col bg-[#151922] text-[#E6E8EB]">
      {/* App Logo Top Navigation Bar Area */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#3B82F6] text-[11px] font-bold text-white shadow-sm ring-1 ring-white/10">
          A
        </div>
        <h1 className="text-sm font-bold tracking-tight text-[#E6E8EB]">
          Archisign AI
        </h1>
      </div>

      <div className="px-5 pt-5 pb-4">
        <button
          type="button"
          onClick={handleSaveNew}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#3B82F6] py-2.5 text-xs font-bold text-white shadow-sm transition duration-150 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50"
        >
          <FiPlusSquare className="h-4 w-4" />
          New Project
        </button>
      </div>

      <div className="px-5 pb-4">
        <SegmentedTabs
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as "scenes" | "history")}
          tabs={[
            { id: "scenes", label: "Scenes" },
            { id: "history", label: "History" },
          ]}
        />
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto p-4 custom-scrollbar">
        {activeTab === "scenes" ? (
          <>
            <div className="mb-6 px-1">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Name your scene..."
                className="w-full rounded-xl border border-transparent hover:border-white/[0.06] bg-transparent hover:bg-[#1A1F29] px-3 py-2 text-sm font-bold text-[#E6E8EB] placeholder:text-[#9CA3AF] focus:border-[#3B82F6] focus:bg-[#1A1F29] focus:outline-none transition-all duration-150 mb-3"
              />
              {selectedSceneId && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleUpdateSelected}
                    className="flex-1 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/20 px-3 py-2 text-[11px] font-bold text-[#3B82F6] transition-all duration-150 hover:bg-[#3B82F6]/20 focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                  >
                    Sync State
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center p-8">
                <FiLoader className="animate-spin h-5 w-5 text-[#9CA3AF]" />
              </div>
            ) : scenes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/[0.06] p-6 text-center shadow-none">
                <p className="text-xs text-[#9CA3AF]">No scenes saved yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Active Scene Section */}
                {selectedSceneId && (
                  <div className="px-1">
                    {scenes
                      .filter((s) => s.id === selectedSceneId)
                      .map((activeScene) => (
                        <ActiveSceneCard
                          key={activeScene.id}
                          title={activeScene.title}
                          updatedAt={activeScene.updated_at}
                        />
                      ))}
                  </div>
                )}

                {/* Saved Scenes List */}
                {scenes.filter((s) => s.id !== selectedSceneId).length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2 px-2">
                      Saved Projects
                    </h4>
                    <ul className="space-y-2 px-1">
                      {scenes
                        .filter((s) => s.id !== selectedSceneId)
                        .map((scene) => (
                          <li key={scene.id}>
                            <SceneListItem
                              id={scene.id}
                              title={scene.title}
                              updatedAt={scene.updated_at}
                              onClick={() => handleLoad(scene)}
                              onDelete={(e) => {
                                e.stopPropagation();
                                void handleDelete(scene.id);
                              }}
                            />
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
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
