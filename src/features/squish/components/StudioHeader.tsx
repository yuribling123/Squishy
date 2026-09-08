// Provides the original studio navigation, sound toggle, and reset action.
"use client";

import {
  Cloud,
  RotateCcw,
  Volume2,
  VolumeX,
  WandSparkles,
} from "lucide-react";
import { useSquishStore } from "../store/useSquishStore";

export function StudioHeader() {
  const soundOn = useSquishStore((state) => state.soundOn);
  const openCustomizer = useSquishStore((state) => state.openCustomizer);
  const toggleSound = useSquishStore((state) => state.toggleSound);
  const resetAvatar = useSquishStore((state) => state.resetAvatar);
  const setStarted = useSquishStore((state) => state.setStarted);

  return (
    <header className="relative z-20 flex h-[76px] items-center justify-between border-b border-line lg:h-[92px]">
      <button
        type="button"
        onClick={() => setStarted(false)}
        aria-label="返回慢慢捏首页"
        className="flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-[17px] font-semibold tracking-[0.08em] lg:gap-3.5 lg:text-[21px]"
      >
        <Cloud className="h-8 w-8 stroke-[1.5] lg:h-9 lg:w-9" />
        <span>慢慢捏</span>
      </button>

      <nav className="flex items-center gap-2 lg:gap-3" aria-label="主要操作">
        <button
          type="button"
          onClick={openCustomizer}
          className="flex h-10 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-white/25 px-3 text-xs tracking-[0.08em] transition hover:border-black/30 hover:bg-white/60 lg:px-4"
        >
          <WandSparkles size={15} />
          DIY 软偶
        </button>
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={soundOn}
          aria-label={`声音${soundOn ? "开" : "关"}`}
          className="flex cursor-pointer items-center gap-1.5 border-0 bg-transparent px-1 py-2 text-[0] tracking-[0.1em] lg:px-2.5 lg:text-[13px]"
        >
          {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          <span className="hidden lg:inline">声音　{soundOn ? "开" : "关"}</span>
        </button>
        <button
          type="button"
          onClick={resetAvatar}
          aria-label="让软偶恢复原状"
          className="grid h-10 w-10 cursor-pointer place-items-center rounded-full border-0 bg-transparent transition hover:bg-black/5"
        >
          <RotateCcw size={21} />
        </button>
      </nav>
    </header>
  );
}
