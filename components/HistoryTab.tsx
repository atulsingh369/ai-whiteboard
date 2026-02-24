"use client";

import { useState, useEffect } from "react";
import { FiLoader } from "react-icons/fi";
import HistoryTimeline from "./sidebar/HistoryTimeline";

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
    <HistoryTimeline
      history={history}
      onSelectPrompt={(prompt) => {
        // Fallback or interactive placeholder since AIPanel usually handles prompts
        console.log("Selected prompt from history:", prompt);
      }}
    />
  );
}
