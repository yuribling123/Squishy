// Switches between receipt editing and the full-page avatar playground.
"use client";

import dynamic from "next/dynamic";
import { RotateCcw, ReceiptText } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { playSquishHaptic } from "../services/haptics";
import { useSquishStore } from "../store/useSquishStore";
import { QuickCustomizer } from "./QuickCustomizer";
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
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-20 bg-background" />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 bg-[url('/paper-grain.svg')] opacity-5" />
      <header className={`items-center justify-center ${isPlaying ? "hidden" : "flex h-20 lg:h-24"}`}>
        <h1 className="relative  text-[23px] tracking-[0.2em]">
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
            {isPlaying && (
              <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center px-4">

                <div className={` absolute left-0  ${isPlaying ? "[&_button]:text-play-muted [&_button:hover]:bg-play-selected [&_button:focus-visible]:outline-play-accent" : ""}`}>
                  <button type="button" onClick={resetAvatar} className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-4 text-xs text-muted transition hover:bg-paper-deep hover:text-ink active:translate-y-0.5 motion-reduce:transform-none">
                    <RotateCcw size={13} aria-hidden="true" />
                    揉回原样
                  </button>

                </div>
                <span className="max-w-full truncate font-serif-cn text-lg tracking-widest text-play-accent">
                  {recipe.name.trim() || "小团"}
                </span>

                <button
                  type="button"
                  onClick={() => setStudioMode("edit")}
                  className="absolute right-1 min-h-8 cursor-pointer items-center  rounded-full border border-play-line bg-transparent px-4 text-xs text-play-muted transition hover:bg-play-selected"
                >

                  编辑
                </button>

              </div>
            )}
            <div className="absolute inset-0 cursor-grab active:cursor-grabbing">
              <ToolEffects>


                {/* 3D人物 */}
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


          {isPlaying && <PlaygroundToolbar />}

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
