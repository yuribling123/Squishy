// Displays the current avatar identity and interaction count.
"use client";

import { getMaterialPreset } from "../domain/materials";
import { useSquishStore } from "../store/useSquishStore";

export function CharacterPanel() {
  const recipe = useSquishStore((state) => state.recipe);
  const savedCharacters = useSquishStore((state) => state.savedCharacters);
  const material = useSquishStore((state) => state.material);
  const squeezeCount = useSquishStore((state) => state.squeezeCount);
  const materialPreset = getMaterialPreset(material);
  const savedIndex = savedCharacters.findIndex(
    (character) => character.name === recipe.name,
  );

  return (
    <aside className="pointer-events-none relative z-10 hidden self-end gap-4 pb-23 lg:flex">
      <span className="font-serif text-[13px] text-[#bb7f5e]">
        {String(Math.max(1, savedIndex + 1)).padStart(2, "0")}
      </span>
      <div>
        <p className="mb-2 text-[10px] tracking-[0.2em] text-muted">我的软偶</p>
        <h2 className="m-0 font-serif-cn text-4xl font-normal">{recipe.name}</h2>
        <p className="mt-3 text-[11px] tracking-[0.1em] text-muted">
          {materialPreset.note}
        </p>
        {squeezeCount > 0 && (
          <p className="mt-5 text-[11px] tracking-[0.1em] text-accent">
            今天揉了 {squeezeCount} 下
          </p>
        )}
      </div>
    </aside>
  );
}
