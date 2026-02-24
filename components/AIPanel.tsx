"use client";

import { useState } from "react";
import type { ExcalidrawElementLike } from "@/types/diagram";

type AIPanelProps = {
  onElementsGenerated: (elements: ExcalidrawElementLike[]) => void;
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

  async function handleGenerate() {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setError("Prompt is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          model,
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
    <div className="flex h-full flex-col p-5 bg-white text-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <svg
            className="h-4 w-4 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
            />
          </svg>
          AI Architect
        </h2>
      </div>

      <div className="mb-6">
        <label
          className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2"
          htmlFor="model"
        >
          Model
        </label>
        <div className="relative">
          <select
            id="model"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
          >
            {MODELS.map((item) => (
              <option key={item} value={item}>
                {item.includes("405b")
                  ? item + " (Pro)"
                  : item.includes("mixtral")
                    ? item
                    : item + " (Fastest)"}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
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
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <label
            className="text-[11px] font-bold text-slate-500 uppercase tracking-wider"
            htmlFor="prompt"
          >
            Prompt
          </label>
          <button className="text-[11px] font-medium text-blue-600 hover:text-blue-700">
            History
          </button>
        </div>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Describe your system architecture...&#10;Example: Create a microservices architecture for an e-commerce app using AWS Lambda, API Gateway, and DynamoDB. Include a Redis cache layer."
          className="flex-1 w-full min-h-[160px] resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
        />

        {error ? (
          <p className="mt-3 text-sm font-medium text-red-500">{error}</p>
        ) : null}
      </div>

      <div className="mt-6">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-3">
          Style
        </label>
        <div className="flex gap-2">
          <button className="flex-1 flex justify-center items-center gap-2 rounded-xl border-2 border-blue-600 bg-blue-50 py-2 text-xs font-semibold text-blue-700">
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
            Technical
          </button>
          <button className="flex-1 flex justify-center items-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 transition">
            <div className="w-2 h-2 rounded-full border-2 border-slate-300"></div>
            Hand-drawn
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] transition hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:-translate-y-0.5 disabled:translate-y-0 disabled:shadow-none disabled:bg-slate-300 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed"
      >
        {loading ? (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
        ) : (
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
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
        )}
        {loading ? "Generating..." : "Generate Diagram"}
      </button>
      <p className="mt-3 text-center text-[10px] text-slate-400">
        Generates editable vector components based on your prompt.
      </p>
    </div>
  );
}
