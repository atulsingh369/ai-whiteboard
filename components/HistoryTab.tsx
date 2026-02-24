"use client";

import { useState, useEffect } from "react";
import { FiLoader, FiGitCommit, FiFileText } from "react-icons/fi";

type HistoryItem = {
  id: string;
  prompt: string;
  model_used: string;
  created_at: string;
};

export default function HistoryTab() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/ai-history");
        const data = (await res.json()) as {
          history?: HistoryItem[];
          error?: string;
        };
        if (data.history) {
          setHistory(data.history);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }

    void fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <FiLoader className="animate-spin h-5 w-5 text-slate-500" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/[0.06] p-6 text-center mt-4 mx-4">
        <p className="text-xs text-[#9CA3AF]">No prompt history yet.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
      <div className="relative border-l border-white/[0.06] ml-3 space-y-6 pb-4">
        {history.map((item, index) => {
          const date = new Date(item.created_at);
          const timeString = date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div key={item.id} className="relative pl-6">
              {/* Timeline diff icon */}
              <div className="absolute -left-[9px] top-1 h-4 w-4 bg-[#151922] flex items-center justify-center">
                <FiGitCommit className="h-3.5 w-3.5 text-[#6B7280]" />
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#9CA3AF]">
                  {timeString}
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-widest text-[#9CA3AF] border border-white/[0.06] px-1.5 py-0.5 rounded-sm">
                  AI Gen
                </span>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-[#1A1F29] p-3 transition duration-150 hover:border-white/[0.12] cursor-pointer">
                <p className="text-xs font-medium text-[#E6E8EB] line-clamp-3 mb-2">
                  {item.prompt}
                </p>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/[0.06]">
                  <FiFileText className="h-3 w-3 text-[#6B7280]" />
                  <span className="text-[10px] text-[#6B7280] truncate font-medium">
                    {item.model_used.includes("/")
                      ? item.model_used.split("/").pop()
                      : item.model_used}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
