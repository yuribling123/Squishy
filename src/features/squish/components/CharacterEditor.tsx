// Provides the full avatar editor and saved-character controls.
"use client";

import { ColorPicker } from "@/components/ui/ColorPicker";
import { RangeControl } from "@/components/ui/RangeControl";
import {
  Angry,
  Heart,
  Save,
  Sparkles,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFIT_COLORS,
  RELATION_OPTIONS,
  SKIN_COLORS,
} from "../domain/avatar.defaults";
import type { AvatarRelation } from "../domain/avatar.types";
import { useSquishStore } from "../store/useSquishStore";

const RELATION_ICONS: Record<AvatarRelation, LucideIcon> = {
  like: Heart,
  dislike: Angry,
  self: UserRound,
  fictional: Sparkles,
};

const OPTION_CLASS =
  "flex h-10.5 cursor-pointer items-center justify-center gap-1.5 rounded-sm border bg-white/25 text-xs tracking-[0.04em] transition hover:border-[#665c4e] hover:bg-[#ebe1d3]";

export function CharacterEditor() {
  const customizing = useSquishStore((state) => state.customizing);
  const draft = useSquishStore((state) => state.draft);
  const savedCharacters = useSquishStore((state) => state.savedCharacters);
  const updateDraft = useSquishStore((state) => state.updateDraft);
  const loadDraft = useSquishStore((state) => state.loadDraft);
  const closeCustomizer = useSquishStore((state) => state.closeCustomizer);
  const saveDraft = useSquishStore((state) => state.saveDraft);

  if (!customizing) return null;

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeCustomizer();
      }}
      className="fixed inset-0 z-50 flex justify-end bg-[#2d271f33] backdrop-blur-[1.5px]"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="character-editor-title"
        className="grid h-full w-full grid-rows-[auto_1fr_auto] bg-[#f8f3eb] shadow-[-30px_0_70px_rgba(40,31,22,0.16)] md:max-w-[470px]"
      >
        <header className="flex min-h-[108px] items-center justify-between border-b border-line px-6 py-5 md:min-h-[118px] md:px-8.5 md:py-6">
          <div>
            <p className="mb-2 font-serif text-[10px] tracking-[0.22em] text-accent">
              MAKE IT YOURS
            </p>
            <h2
              id="character-editor-title"
              className="m-0 font-serif-cn text-[31px] font-normal"
            >
              做一只软偶
            </h2>
          </div>
          <button
            type="button"
            aria-label="关闭角色编辑器"
            onClick={closeCustomizer}
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-line bg-transparent transition hover:bg-black/5"
          >
            <X size={20} />
          </button>
        </header>

        <div className="overflow-y-auto px-6 py-6 md:px-8.5">
          <label className="mb-7 block text-[11px] tracking-[0.13em] text-muted">
            给 TA 起个名字
            <input
              className="mt-2.5 w-full border-0 border-b border-black/20 bg-transparent py-2.5 font-serif-cn text-[23px] text-ink outline-none transition focus:border-ink"
              value={draft.name}
              maxLength={12}
              onChange={(event) => updateDraft({ name: event.target.value })}
              placeholder="例如：小团"
            />
          </label>

          <EditorFieldset legend="TA 是谁">
            <div className="grid grid-cols-2 gap-2">
              {RELATION_OPTIONS.map((option) => {
                const Icon = RELATION_ICONS[option.id];
                const selected = draft.relation === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => updateDraft({ relation: option.id })}
                    className={`${OPTION_CLASS} ${selected ? "border-[#665c4e] bg-[#ebe1d3]" : "border-line"}`}
                  >
                    <Icon size={16} />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </EditorFieldset>

          <EditorFieldset legend="轮廓">
            <div className="grid grid-cols-2 gap-x-5 gap-y-4.5">
              <RangeControl compact label="头部大小" min={0.86} max={1.18} step={0.01} value={draft.headSize} onChange={(headSize) => updateDraft({ headSize })} />
              <RangeControl compact label="身体圆润" min={0.82} max={1.24} step={0.01} value={draft.bodySize} onChange={(bodySize) => updateDraft({ bodySize })} />
              <RangeControl compact label="高矮比例" min={0.88} max={1.1} step={0.01} value={draft.height} onChange={(height) => updateDraft({ height })} />
              <RangeControl compact label="眼睛大小" min={0.78} max={1.3} step={0.01} value={draft.eyeSize} onChange={(eyeSize) => updateDraft({ eyeSize })} />
            </div>
          </EditorFieldset>

          <EditorFieldset legend="发型">
            <div className="grid grid-cols-3 gap-2">
              {HAIR_STYLES.map((name, index) => {
                const selected = draft.hairStyle === index;
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => updateDraft({ hairStyle: index })}
                    className={`${OPTION_CLASS} ${selected ? "border-[#665c4e] bg-[#ebe1d3]" : "border-line"}`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </EditorFieldset>

          <ColorPicker label="肤色" colors={SKIN_COLORS} value={draft.skin} onChange={(skin) => updateDraft({ skin })} />
          <ColorPicker label="发色" colors={HAIR_COLORS} value={draft.hairColor} onChange={(hairColor) => updateDraft({ hairColor })} />
          <ColorPicker label="衣服" colors={OUTFIT_COLORS} value={draft.outfitColor} onChange={(outfitColor) => updateDraft({ outfitColor })} />

          {savedCharacters.length > 0 && (
            <EditorFieldset legend="以前做的">
              <div className="flex flex-wrap gap-2">
                {savedCharacters.map((character) => (
                  <button
                    type="button"
                    key={character.name}
                    onClick={() => loadDraft(character)}
                    className="h-8.5 cursor-pointer rounded-sm border border-line bg-white/25 px-3.5 text-xs transition hover:border-[#665c4e] hover:bg-[#ebe1d3]"
                  >
                    {character.name}
                  </button>
                ))}
              </div>
            </EditorFieldset>
          )}
        </div>

        <footer className="flex min-h-[90px] items-center justify-between gap-4 border-t border-line px-6 py-4.5 md:px-8.5">
          <p className="m-0 hidden text-[10px] tracking-[0.08em] text-muted sm:block">
            角色只保存在这台设备上
          </p>
          <button
            type="button"
            onClick={saveDraft}
            className="ml-auto flex h-11.5 cursor-pointer items-center gap-2 rounded-full border border-ink bg-ink px-5 text-xs text-paper transition hover:-translate-y-0.5"
          >
            <Save size={16} />
            保存并开始捏
          </button>
        </footer>
      </section>
    </div>
  );
}

function EditorFieldset({
  legend,
  children,
}: {
  legend: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="mb-7 border-0 p-0 text-[11px] tracking-[0.13em] text-muted">
      <legend className="mb-3.5">{legend}</legend>
      {children}
    </fieldset>
  );
}
