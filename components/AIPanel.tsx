"use client";

import { useState } from "react";
import { FiBox, FiChevronDown, FiLoader, FiZap } from "react-icons/fi";
import type { ExcalidrawElementLike } from "@/types/diagram";
import { useUIStore } from "@/stores/uiStore";

type AIPanelProps = {
  onElementsGenerated: (elements: ExcalidrawElementLike[]) => void;
};

type HistoryItem = {
  id: string;
  prompt: string;
  model_used: string;
  created_at: string;
  sceneTitle?: string | null;
};

const MODELS = [
  "meta/llama-3.1-70b-instruct",
  "meta/llama3-70b-instruct",
  "mistralai/mixtral-8x22b-instruct-v0.1",
];

export default function AIPanel({ onElementsGenerated }: AIPanelProps) {
  const { activeSceneTitle } = useUIStore();
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
          sceneTitle: activeSceneTitle,
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
    <div className="flex h-full flex-col p-5 bg-transparent text-txt-primary border-t-0 relative z-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-bold tracking-tight text-txt-primary flex items-center gap-2">
          <FiBox className="h-4 w-4 text-accent" />
          AI Architect
        </h2>
      </div>

      <div className="mb-6">
        <label
          className="text-[11px] font-bold text-txt-secondary uppercase tracking-wider block mb-2"
          htmlFor="model"
        >
          Model
        </label>
        <div className="relative">
          <select
            id="model"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            className="w-full appearance-none rounded-xl border border-border-subtle bg-surface-2 px-3 py-2.5 text-sm font-medium text-txt-primary outline-none transition duration-150 focus:border-accent focus:bg-surface-3 focus:ring-1 focus:ring-accent cursor-pointer"
          >
            {MODELS.map((item) => (
              <option
                key={item}
                value={item}
                className="bg-surface-2 text-txt-primary"
              >
                {item.includes("405b")
                  ? item + " (Pro)"
                  : item.includes("mixtral")
                    ? item
                    : item + " (Fastest)"}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-txt-secondary">
            <FiChevronDown className="h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <label
            className="text-[11px] font-bold text-txt-secondary uppercase tracking-wider"
            htmlFor="prompt"
          >
            Prompt
          </label>
          <button
            type="button"
            className="text-[11px] font-bold text-accent hover:text-accent-hover transition duration-150"
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
          <div className="flex-1 overflow-y-auto rounded-xl border border-border-subtle bg-surface-2 custom-scrollbar">
            {historyLoading ? (
              <div className="flex py-8 justify-center">
                <FiLoader className="animate-spin h-5 w-5 text-txt-secondary" />
              </div>
            ) : history.length === 0 ? (
              <p className="p-4 text-xs text-txt-secondary text-center">
                No history yet. Generate your first diagram!
              </p>
            ) : (
              <ul className="divide-y divide-border-subtle">
                {history.map((item) => (
                  <li key={item.id} className="group">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-3 hover:bg-surface-3 transition duration-150"
                      onClick={() => {
                        setPrompt(item.prompt);
                        setShowHistory(false);
                      }}
                    >
                      <p className="text-xs font-semibold text-txt-primary group-hover:text-accent truncate transition duration-150">
                        {item.prompt}
                      </p>
                      <p className="text-[10px] text-txt-secondary mt-1 uppercase tracking-widest font-bold">
                        {item.sceneTitle ? (
                          <span className="text-accent">
                            {item.sceneTitle} •{" "}
                          </span>
                        ) : null}
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
            className="flex-1 w-full min-h-[160px] resize-none rounded-lg border border-border-subtle bg-surface-app/50 p-4 font-mono text-xs leading-relaxed text-txt-primary placeholder:text-txt-secondary outline-none transition duration-200 focus:border-accent focus:bg-surface-app/80 focus:ring-1 focus:ring-accent/50 shadow-inner"
          />
        )}

        {error ? (
          <p className="mt-3 text-sm font-medium text-red-500">{error}</p>
        ) : null}
      </div>

      <div className="mt-6">
        <label className="text-[11px] font-bold text-txt-secondary uppercase tracking-wider block mb-3">
          Style
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStyle("technical")}
            className={`flex-1 flex justify-center items-center gap-2 rounded-xl py-2.5 text-xs font-bold transition duration-150 border ${
              style === "technical"
                ? "border-border-subtle bg-surface-3 text-txt-primary shadow-sm"
                : "border-transparent bg-surface-2 text-txt-secondary hover:text-txt-primary hover:bg-surface-3"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${style === "technical" ? "bg-txt-primary" : "bg-txt-muted"}`}
            />
            Technical
          </button>
          <button
            type="button"
            onClick={() => setStyle("handdrawn")}
            className={`flex-1 flex justify-center items-center gap-2 rounded-xl py-2.5 text-xs font-bold transition duration-150 border ${
              style === "handdrawn"
                ? "border-border-subtle bg-surface-3 text-txt-primary shadow-sm"
                : "border-transparent bg-surface-2 text-txt-secondary hover:text-txt-primary hover:bg-surface-3"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${style === "handdrawn" ? "bg-txt-primary" : "bg-txt-muted"}`}
            />
            Hand-drawn
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-white transition duration-150 hover:bg-accent-hover disabled:bg-surface-3 disabled:text-txt-muted disabled:cursor-not-allowed shadow-sm"
      >
        {loading ? (
          <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
        ) : (
          <FiZap className="h-4 w-4" />
        )}
        {loading ? "Generating..." : "Generate Diagram"}
      </button>
      <p className="mt-3 text-center text-[10px] text-txt-secondary">
        Generates editable vector components based on your prompt.
      </p>
    </div>
  );
}
