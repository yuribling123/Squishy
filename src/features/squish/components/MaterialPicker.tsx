// Lets users select the avatar material preset.
"use client";

import { MATERIAL_PRESETS } from "../domain/materials";
import { useSquishStore } from "../store/useSquishStore";

export function MaterialPicker() {
  const material = useSquishStore((state) => state.material);
  const setMaterial = useSquishStore((state) => state.setMaterial);

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 lg:justify-start lg:gap-[clamp(18px,3vw,48px)]">
      {MATERIAL_PRESETS.map((preset) => {
        const selected = material === preset.id;

        return (
          <button
            key={preset.id}
            type="button"
            aria-pressed={selected}
            onClick={() => setMaterial(preset.id)}
            className={`flex cursor-pointer flex-col items-center gap-1.5 border-0 bg-transparent py-2 text-xs transition hover:-translate-y-0.5 hover:text-ink sm:flex-row sm:gap-2.5 ${selected ? "text-ink" : "text-muted"}`}
          >
            <span
              aria-hidden="true"
              className={`h-8 w-8 rounded-full border border-black/10 shadow-[inset_5px_5px_9px_rgba(255,255,255,0.45),0_4px_12px_rgba(66,51,35,0.09)] ${selected ? "outline outline-1 outline-offset-4 outline-ink" : ""}`}
              style={{ backgroundColor: preset.swatch }}
            />
            {preset.name}
          </button>
        );
      })}
    </div>
  );
}
