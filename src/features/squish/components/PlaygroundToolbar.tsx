// Displays the three playground tools and their usage hints.
"use client";

import { Hand, Heart, Spline } from "lucide-react";
import { PLAYGROUND_TOOLS } from "../domain/tools";
import { useSquishStore } from "../store/useSquishStore";

const icons = { squish: Hand, heart: Heart, whip: Spline };

export function PlaygroundToolbar() {
  const tool = useSquishStore((state) => state.tool);
  const setTool = useSquishStore((state) => state.setTool);

  return (
    <div className="mt-3 text-center [&_button:focus-visible]:outline-play-accent">
      <p aria-live="polite" className="mb-3 text-xs text-play-muted">
        {PLAYGROUND_TOOLS.find((item) => item.id === tool)?.hint}
      </p>
      <div role="group" aria-label="小道具盒" className="inline-flex items-center gap-2 rounded-2xl border border-play-line bg-transparent p-2 shadow-sm">
        {PLAYGROUND_TOOLS.map(({ id, label }) => {
          const Icon = icons[id];
          return (
            <button
              key={id}
              type="button"
              aria-pressed={tool === id}
              onClick={() => setTool(id)}
              className={`flex min-h-14 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl text-xs transition ${tool === id ? "bg-play-selected text-play-accent ring-1 ring-play-accent/15" : "text-play-muted hover:bg-play-selected/50"}`}
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
