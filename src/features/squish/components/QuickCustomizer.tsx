// Presents an editable receipt for the avatar name, relationship, and hairstyle.
"use client";

import { Check, Printer } from "lucide-react";
import { HAIR_STYLES } from "../domain/avatar.defaults";
import type { AvatarRelation } from "../domain/avatar.types";
import { useSquishStore } from "../store/useSquishStore";

export const QUICK_RELATIONS: { id: AvatarRelation; label: string; symbol: string }[] = [
  { id: "like", label: "喜欢的人", symbol: "♡" },
  { id: "dislike", label: "有点讨厌的人", symbol: "↯" },
  { id: "self", label: "我自己", symbol: "☺" },
];

function HairPreview({ style }: { style: number }) {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true" className="h-16 w-16 grayscale">
      <ellipse cx="40" cy="70" rx="19" ry="3" fill="#e2ded5" />
      <rect x="23" y="54" width="34" height="16" rx="8" fill="#040c23e7" />
      <ellipse cx="40" cy="38" rx="21" ry="23" fill="#f0ba99" />
      {style === 0 && <path d="M19 37C13 8 61 6 62 33L51 26 42 30 30 25 22 38Z" fill="#413c42" />}
      {style === 1 && <path d="M15 40C12 3 68 3 65 40L53 40 51 30 29 30 27 40Z" fill="#413c42" />}
      {style === 2 && (
        <g fill="#413c42">
          <circle cx="25" cy="15" r="10" />
          <circle cx="56" cy="15" r="10" />
          <path d="M19 36C13 7 66 7 61 36L51 27 29 27Z" />
        </g>
      )}
      <circle cx="33" cy="40" r="2" fill="#413c42" />
      <circle cx="47" cy="40" r="2" fill="#413c42" />
      <path d="M36 49Q40 52 44 49" fill="none" stroke="#a56959" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function QuickCustomizer({ onPrint }: { onPrint: () => void }) {
  const recipe = useSquishStore((state) => state.recipe);
  const updateRecipe = useSquishStore((state) => state.updateRecipe);

  return (
    <section
      aria-label="小替身领养小票"
      className="relative mx-auto w-[calc(100%-1rem)] max-w-[340px] bg-receipt px-5 pt-7 pb-8 font-[family-name:var(--font-geist-mono)] text-ink shadow-[0_12px_30px_#493b3912,0_2px_3px_#493b390a] sm:px-6 lg:w-full"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[url('/paper-grain.svg')] opacity-15" />
      <header className="relative border-b border-dashed border-ink/35 pb-5 text-center">
        <p className="text-[10px] tracking-[0.22em] text-muted">A LITTLE STAND-IN</p>


      </header>
      <div className="relative flex items-center gap-4 border-b border-dashed border-ink/35 py-3">
        <label htmlFor="avatar-name" className="shrink-0 text-xs">称呼</label>
        <input
          id="avatar-name"
          value={recipe.name}
          onChange={(event) => updateRecipe({ name: event.target.value })}
          maxLength={20}
          placeholder="起个名字"
          autoComplete="off"
          className="h-11 min-w-0 flex-1 rounded-none border-0 border-b border-ink/25 bg-transparent px-1 text-right text-base transition placeholder:text-muted/60 focus:border-accent focus:bg-mist/15"
        />
      </div>
      <fieldset className="relative mt-5">
        <legend className="mb-1 text-xs">与我的关系</legend>
        <div className="flex flex-wrap gap-x-3">
          {QUICK_RELATIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={recipe.relation === id}
              onClick={() => updateRecipe({ relation: id })}
              className={`flex min-h-11 cursor-pointer items-center gap-2 px-0.5 text-xs transition hover:text-accent ${recipe.relation === id ? "text-accent" : "text-muted"}`}
            >
              <span aria-hidden="true" className="grid h-3.5 w-3.5 place-items-center border border-current">
                {recipe.relation === id && <Check size={13} strokeWidth={2} />}
              </span>
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="relative mt-4">
        <legend className="mb-3 text-xs">今日发型</legend>
        <div className="grid grid-cols-3 gap-1.5">
          {HAIR_STYLES.map((label, index) => (
            <button
              key={label}
              type="button"
              aria-pressed={recipe.hairStyle === index}
              onClick={() => updateRecipe({ hairStyle: index })}
              className={`relative flex cursor-pointer flex-col items-center border pt-2 pb-3 text-[11px] transition active:translate-y-0.5 motion-reduce:transform-none ${recipe.hairStyle === index ? "border-accent/55 text-accent" : "border-transparent text-muted hover:border-accent/20"}`}
            >
              {recipe.hairStyle === index && <Check size={12} className="absolute top-2 right-2" aria-hidden="true" />}
              <HairPreview style={index} />
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <dl className="relative mt-5 space-y-2 border-y border-dashed border-ink/35 py-4 text-xs">
        <div className="flex justify-between"><dt>数量</dt><dd>1 位</dd></div>
        <div className="flex justify-between"><dt>用途</dt><dd>随时捏捏</dd></div>
      </dl>
      <footer className="relative pt-5 text-center">
        <button
          type="button"
          onClick={onPrint}
          className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 border-[3px] border-double border-accent/65 px-4 py-0 text-sm tracking-[0.2em] text-accent transition hover:bg-mist/40 active:translate-y-0.5 motion-reduce:transform-none"
        >
        
          打印
        </button>
        <p className="mt-4 text-[11px] text-muted">不用做得像，你知道就好。</p>
        <p className="mt-2 text-[9px] tracking-[0.16em] text-muted">KEEP YOUR LITTLE SOMEONE.</p>
      </footer>
      <svg aria-hidden="true" viewBox="0 0 320 10" preserveAspectRatio="none" className="pointer-events-none absolute -bottom-2 inset-x-0 h-2 w-full fill-receipt">
        <path d="M0 0H320V2L312 10 304 2 296 10 288 2 280 10 272 2 264 10 256 2 248 10 240 2 232 10 224 2 216 10 208 2 200 10 192 2 184 10 176 2 168 10 160 2 152 10 144 2 136 10 128 2 120 10 112 2 104 10 96 2 88 10 80 2 72 10 64 2 56 10 48 2 40 10 32 2 24 10 16 2 8 10 0 2Z" />
      </svg>
    </section>
  );
}
