"use client";

import { useState } from "react";
import { FiBox, FiChevronDown, FiLoader, FiZap } from "react-icons/fi";
import type { ExcalidrawElementLike } from "@/types/diagram";

type AIPanelProps = {
  onElementsGenerated: (elements: ExcalidrawElementLike[]) => void;
};

type HistoryItem = {
  id: string;
  prompt: string;
  model_used: string;
  created_at: string;
};

const MODELS = [
  "meta/llama-3.1-70b-instruct",
  "meta/llama3-70b-instruct",
  "mistralai/mixtral-8x22b-instruct-v0.1",
];

export default function AIPanel({ onElementsGenerated }: AIPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(MODELS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [style, setStyle] = useState<"technical" | "handdrawn">("technical");
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  async function fetchHistory() {
    setHistoryLoading(true);
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
      setHistoryLoading(false);
    }
  }

  async function handleGenerate() {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setError("Prompt is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const styleInstruction =
        style === "handdrawn"
          ? " Use a hand-drawn, sketch-like style for the diagram."
          : " Use a clean, technical diagram style.";

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: trimmedPrompt + styleInstruction,
          model,
          style,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        elements?: ExcalidrawElementLike[];
      };

      if (!response.ok || !payload.elements) {
        throw new Error(payload.error ?? "Failed to generate diagram.");
      }

      onElementsGenerated(payload.elements);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unexpected error while generating diagram.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col p-5 bg-[#1A1F29] text-[#E6E8EB] border-l border-white/[0.06] relative z-10 w-80">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-bold tracking-tight text-[#E6E8EB] flex items-center gap-2">
          <FiBox className="h-4 w-4 text-[#3B82F6]" />
          AI Architect
        </h2>
      </div>

      <div className="mb-6">
        <label
          className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-2"
          htmlFor="model"
        >
          Model
        </label>
        <div className="relative">
          <select
            id="model"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            className="w-full appearance-none rounded-xl border border-white/[0.06] bg-[#0F1115] px-3 py-2.5 text-sm font-medium text-[#E6E8EB] outline-none transition duration-150 focus:border-[#3B82F6] focus:bg-[#1A1F29] focus:ring-1 focus:ring-[#3B82F6] cursor-pointer"
          >
            {MODELS.map((item) => (
              <option
                key={item}
                value={item}
                className="bg-[#1A1F29] text-[#E6E8EB]"
              >
                {item.includes("405b")
                  ? item + " (Pro)"
                  : item.includes("mixtral")
                    ? item
                    : item + " (Fastest)"}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#9CA3AF]">
            <FiChevronDown className="h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <label
            className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider"
            htmlFor="prompt"
          >
            Prompt
          </label>
          <button
            type="button"
            className="text-[11px] font-bold text-[#3B82F6] hover:text-[#2563EB] transition duration-150"
            onClick={() => {
              setShowHistory(!showHistory);
              if (!showHistory && history.length === 0) {
                void fetchHistory();
              }
            }}
          >
            {showHistory ? "Close" : "History"}
          </button>
        </div>

        {showHistory ? (
          <div className="flex-1 overflow-y-auto rounded-xl border border-white/[0.06] bg-[#0F1115] custom-scrollbar">
            {historyLoading ? (
              <div className="flex py-8 justify-center">
                <FiLoader className="animate-spin h-5 w-5 text-[#9CA3AF]" />
              </div>
            ) : history.length === 0 ? (
              <p className="p-4 text-xs text-[#9CA3AF] text-center">
                No history yet. Generate your first diagram!
              </p>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {history.map((item) => (
                  <li key={item.id} className="group">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-3 hover:bg-white/5 transition duration-150"
                      onClick={() => {
                        setPrompt(item.prompt);
                        setShowHistory(false);
                      }}
                    >
                      <p className="text-xs font-semibold text-[#E6E8EB] group-hover:text-[#3B82F6] truncate transition duration-150">
                        {item.prompt}
                      </p>
                      <p className="text-[10px] text-[#9CA3AF] mt-1 uppercase tracking-widest font-bold">
                        {item.model_used.includes("/")
                          ? item.model_used.split("/").pop()
                          : item.model_used}{" "}
                        •{" "}
                        {new Date(item.created_at).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <textarea
            id="prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={
              "Describe your system architecture...\nExample: Create a microservices architecture for an e-commerce app using AWS Lambda, API Gateway, and DynamoDB. Include a Redis cache layer."
            }
            className="flex-1 w-full min-h-[160px] resize-none rounded-xl border border-white/[0.06] bg-[#0F1115] p-3 text-sm text-[#E6E8EB] placeholder:text-[#9CA3AF] outline-none transition duration-150 focus:border-[#3B82F6] focus:bg-[#1A1F29] focus:ring-1 focus:ring-[#3B82F6]"
          />
        )}

        {error ? (
          <p className="mt-3 text-sm font-medium text-red-500">{error}</p>
        ) : null}
      </div>

      <div className="mt-6">
        <label className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-3">
          Style
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStyle("technical")}
            className={`flex-1 flex justify-center items-center gap-2 rounded-xl py-2.5 text-xs font-bold transition duration-150 border ${
              style === "technical"
                ? "border-white/[0.12] bg-[#151922] text-[#E6E8EB]"
                : "border-white/[0.06] bg-[#0F1115] text-[#9CA3AF] hover:text-[#E6E8EB] hover:bg-[#151922]"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${style === "technical" ? "bg-[#E6E8EB]" : "bg-[#4B5563]"}`}
            />
            Technical
          </button>
          <button
            type="button"
            onClick={() => setStyle("handdrawn")}
            className={`flex-1 flex justify-center items-center gap-2 rounded-xl py-2.5 text-xs font-bold transition duration-150 border ${
              style === "handdrawn"
                ? "border-white/[0.12] bg-[#151922] text-[#E6E8EB]"
                : "border-white/[0.06] bg-[#0F1115] text-[#9CA3AF] hover:text-[#E6E8EB] hover:bg-[#151922]"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${style === "handdrawn" ? "bg-[#E6E8EB]" : "bg-[#4B5563]"}`}
            />
            Hand-drawn
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-[#3B82F6] py-3 text-sm font-bold text-white transition duration-150 hover:bg-blue-600 disabled:bg-[#374151] disabled:text-[#9CA3AF] disabled:cursor-not-allowed"
      >
        {loading ? (
          <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
        ) : (
          <FiZap className="h-4 w-4" />
        )}
        {loading ? "Generating..." : "Generate Diagram"}
      </button>
      <p className="mt-3 text-center text-[10px] text-[#9CA3AF]">
        Generates editable vector components based on your prompt.
      </p>
    </div>
  );
}
