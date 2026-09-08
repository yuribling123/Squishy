// Switches between receipt editing and the full-page avatar playground.
"use client";

import dynamic from "next/dynamic";
import { RotateCcw, ReceiptText } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { playSquishHaptic } from "../services/haptics";
import { useSquishStore } from "../store/useSquishStore";
import { QuickCustomizer, QUICK_RELATIONS } from "./QuickCustomizer";
import { DreamAtmosphere } from "./DreamAtmosphere";
import { PlaygroundToolbar } from "./PlaygroundToolbar";
import { ToolEffects } from "./ToolEffects";

const AvatarCanvas = dynamic(() => import("../scene/AvatarCanvas"), {
  ssr: false,
  loading: () => (
    <div role="status" className="absolute inset-0 grid place-items-center text-sm text-muted">
      小人正在赶来…
    </div>
  ),
});

export function SquishStudio() {
  const recipe = useSquishStore((state) => state.recipe);
  const studioMode = useSquishStore((state) => state.studioMode);
  const setStudioMode = useSquishStore((state) => state.setStudioMode);
  const isPlaying = studioMode === "play";
  const stageRef = useRef<HTMLElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const previousMode = useRef(studioMode);
  const resetKey = useSquishStore((state) => state.resetKey);
  const resetAvatar = useSquishStore((state) => state.resetAvatar);
  const squeezeCount = useSquishStore((state) => state.squeezeCount);
  const recordSqueeze = useSquishStore((state) => state.recordSqueeze);
  const relation = QUICK_RELATIONS.find((item) => item.id === recipe.relation);

  useEffect(() => {
    if (previousMode.current === studioMode) return;
    previousMode.current = studioMode;
    if (isPlaying) {
      window.scrollTo({ top: 0, behavior: "instant" });
      stageRef.current?.focus({ preventScroll: true });
    } else {
      editorRef.current?.scrollIntoView({ block: "center", behavior: "instant" });
      editorRef.current?.focus({ preventScroll: true });
    }
  }, [studioMode, isPlaying]);

  const handleSqueeze = useCallback((part: string) => {
    recordSqueeze(part);
    playSquishHaptic();
  }, [recordSqueeze]);

  return (
    <main className={`relative isolate mx-auto min-h-svh px-5 sm:px-10 ${isPlaying ? "w-full" : "max-w-[1240px] lg:px-14"}`}>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(ellipse_at_10%_20%,#c6d8bf55,transparent_45%),radial-gradient(ellipse_at_90%_80%,#ddc3bc55,transparent_50%)]" />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 bg-[url('/paper-grain.svg')] opacity-20" />
      <header className={`items-center justify-center ${isPlaying ? "hidden" : "flex h-20 lg:h-24"}`}>
        <h1 className="relative font-serif-cn text-[23px] font-normal tracking-[0.3em]">
          小替身
        </h1>
      </header>
      <div className={`relative grid items-center ${isPlaying ? "min-h-svh grid-cols-1 py-4" : "gap-7 pt-3 pb-10 lg:min-h-[calc(100svh-164px)] lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14 lg:py-8"}`}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 bottom-3 -z-10  lg:-inset-x-4" />
        <section
          ref={stageRef}
          tabIndex={-1}
          aria-label={isPlaying ? "全屏捏捏模式" : "可互动的小人"}
          className={`relative min-w-0 outline-none ${isPlaying ? "mx-auto w-full max-w-[1100px]" : ""}`}
        >
          <div className={`relative ${isPlaying ? "h-[calc(100svh-290px)] min-h-[200px]" : "h-[300px] sm:h-[450px] lg:h-[510px]"}`}>
            <DreamAtmosphere />
            <div className="absolute inset-0 cursor-grab active:cursor-grabbing">
              <ToolEffects>
              <AvatarCanvas
                recipe={recipe}
                material="mochi"
                softness={56}
                rebound={38}
                resetKey={resetKey}
                onSqueeze={handleSqueeze}
              />
              </ToolEffects>
            </div>
            {squeezeCount === 0 && !isPlaying && (
              <span className="pointer-events-none absolute top-12 right-0 -rotate-6 px-3 py-2 font-serif-cn text-xs tracking-wide text-muted lg:top-24 lg:right-[4%]">
                试着捏捏脸 ↙
              </span>
            )}
          </div>
          <div className="flex justify-center">
            <div className="relative flex max-w-full items-center gap-3 border-y border-accent/20 px-5 py-3">
              <span className="max-w-40 truncate font-serif-cn text-lg tracking-widest">{recipe.name.trim() || "小团"}</span>
              {relation && <span className="border-l border-line pl-3 text-[11px] text-accent">{relation.label}</span>}
            </div>
          </div>

          {isPlaying && <PlaygroundToolbar />}
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={resetAvatar} className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-4 text-xs text-muted transition hover:bg-paper-deep hover:text-ink active:translate-y-0.5 motion-reduce:transform-none">
              <RotateCcw size={13} aria-hidden="true" />
              揉回原样
            </button>
            {isPlaying && (
              <button
                type="button"
                onClick={() => setStudioMode("edit")}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-accent/25 bg-paper/60 px-4 text-xs text-accent transition hover:bg-paper-deep"
              >
                <ReceiptText size={14} aria-hidden="true" />
                编辑小票
              </button>
            )}
          </div>
        </section>
        {!isPlaying && (
          <div ref={editorRef} tabIndex={-1} role="region" aria-label="小票编辑模式" className="min-w-0 outline-none">
            <QuickCustomizer onPrint={() => setStudioMode("play")} />
          </div>
        )}
      </div>
   
    </main>
  );
}
