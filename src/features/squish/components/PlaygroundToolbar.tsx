// Displays the three playground tools and their usage hints.
"use client";

import { Hand, Heart, Pencil, RotateCcw, Spline } from "lucide-react";
import { PLAYGROUND_TOOLS } from "../domain/tools";
import { useSquishStore } from "../store/useSquishStore";

const icons = { squish: Hand, heart: Heart, whip: Spline };

export function PlaygroundToolbar() {
  const tool = useSquishStore((state) => state.tool);
  const setTool = useSquishStore((state) => state.setTool);
  const autoRecover = useSquishStore((state) => state.autoRecover);
  const toggleAutoRecover = useSquishStore((state) => state.toggleAutoRecover);
  const resetAvatar = useSquishStore((state) => state.resetAvatar);
  const setStudioMode = useSquishStore((state) => state.setStudioMode);

  return (
    <div className="mt-3 text-center [&_button:focus-visible]:outline-play-accent">
      <p aria-live="polite" className="mb-3 text-xs text-play-muted">
        {PLAYGROUND_TOOLS.find((item) => item.id === tool)?.hint
          ?? "左右拖拽查看小人，选择捏捏后可进行形变。"}
      </p>
      <div role="group" aria-label="小道具盒" className="inline-flex items-center gap-1 rounded-2xl border border-play-line bg-transparent p-2 shadow-sm sm:gap-2">
        <button
          type="button"
          onClick={resetAvatar}
          className="flex min-h-14 w-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl text-xs text-play-muted transition hover:bg-play-selected/50 sm:w-16"
        >
          <RotateCcw size={19} aria-hidden="true" />
          复原
        </button>
        {PLAYGROUND_TOOLS.map(({ id, label }) => {
          const Icon = icons[id];
          return (
            <button
              key={id}
              type="button"
              aria-pressed={tool === id}
              onClick={() => setTool(id)}
              className={`flex min-h-14 w-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl text-xs transition sm:w-16 ${tool === id ? "bg-play-selected text-play-accent ring-1 ring-play-accent/15" : "text-play-muted hover:bg-play-selected/50"}`}
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setStudioMode("edit")}
          className="flex min-h-14 w-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl text-xs text-play-muted transition hover:bg-play-selected/50 sm:w-16"
        >
          <Pencil size={19} aria-hidden="true" />
          编辑
        </button>
      </div>
      <div className="mt-2">
        <button
          type="button"
          role="switch"
          aria-checked={autoRecover}
          onClick={toggleAutoRecover}
          className="inline-flex min-h-10 cursor-pointer items-center gap-3 rounded-xl border border-play-line bg-transparent px-3 text-xs text-play-muted transition hover:bg-play-selected focus-visible:!outline-none focus-visible:ring-2 focus-visible:ring-play-accent/25"
        >
          自动复原
          <span
            aria-hidden="true"
            className={`relative h-5 w-10 shrink-0 rounded-full transition-colors ${autoRecover ? "bg-play-accent" : "bg-play-line"}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${autoRecover ? "translate-x-5" : "translate-x-0"}`} />
          </span>
        </button>
      </div>
    </div>
  );
}
