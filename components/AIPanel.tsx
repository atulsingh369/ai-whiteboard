"use client";

import { useState } from "react";
import type { ExcalidrawElementLike } from "@/types/diagram";

type AIPanelProps = {
  onElementsGenerated: (elements: ExcalidrawElementLike[]) => void;
};

const MODELS = [
  "meta/llama3-70b-instruct",
  "meta/llama-3.1-405b-instruct",
  "mistralai/mixtral-8x22b-instruct-v0.1"
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
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          model
        })
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
      setError(err instanceof Error ? err.message : "Unexpected error while generating diagram.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="fixed bottom-6 right-6 z-20 w-[360px] rounded-xl border border-slate-700 bg-slate-900/95 p-4 text-slate-100 shadow-2xl backdrop-blur">
      <h2 className="text-base font-semibold">AI Diagram Generator</h2>
      <p className="mt-1 text-xs text-slate-300">Generate Excalidraw diagram nodes and arrows from plain language.</p>

      <label className="mt-3 block text-xs font-medium text-slate-200" htmlFor="model">
        Model
      </label>
      <select
        id="model"
        value={model}
        onChange={(event) => setModel(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
      >
        {MODELS.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <label className="mt-3 block text-xs font-medium text-slate-200" htmlFor="prompt">
        Prompt
      </label>
      <textarea
        id="prompt"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        rows={6}
        placeholder="Example: Show API gateway connected to auth, users service, and postgres database"
        className="mt-1 w-full resize-none rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
      />

      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="mt-3 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Generating..." : "Generate Diagram"}
      </button>
    </aside>
  );
}
