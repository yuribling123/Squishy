// Displays the three playground tools, usage hints, and sound control.
"use client";

import { Hand, Heart, Spline, Volume2, VolumeX } from "lucide-react";
import { PLAYGROUND_TOOLS } from "../domain/tools";
import { useSquishStore } from "../store/useSquishStore";

const icons = { squish: Hand, heart: Heart, whip: Spline };

export function PlaygroundToolbar() {
  const tool = useSquishStore((state) => state.tool);
  const setTool = useSquishStore((state) => state.setTool);
  const soundOn = useSquishStore((state) => state.soundOn);
  const toggleSound = useSquishStore((state) => state.toggleSound);

  return (
    <div className="mt-3 text-center">
      <p aria-live="polite" className="mb-3 text-xs text-muted">
        {PLAYGROUND_TOOLS.find((item) => item.id === tool)?.hint}
      </p>
      <div role="group" aria-label="小道具盒" className="inline-flex items-center gap-2 rounded-2xl border border-accent/20 bg-transparent p-2 shadow-sm">
        {PLAYGROUND_TOOLS.map(({ id, label }) => {
          const Icon = icons[id];
          return (
            <button
              key={id}
              type="button"
              aria-pressed={tool === id}
              onClick={() => setTool(id)}
              className={`flex min-h-14 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl text-xs transition ${tool === id ? "bg-mist/5 text-accent ring-1 ring-accent/30" : "text-muted hover:bg-white/30"}`}
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </button>
          );
        })}
        <button type="button" aria-label={soundOn ? "关闭声音" : "开启声音"} aria-pressed={soundOn} onClick={toggleSound} className="grid h-12 w-11 cursor-pointer place-items-center border-l border-line text-muted">
          {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>
    </div>
  );
}
