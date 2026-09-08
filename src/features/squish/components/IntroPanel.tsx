// Displays the original studio introduction and entry actions.
"use client";

import { SlidersHorizontal } from "lucide-react";
import { useSquishStore } from "../store/useSquishStore";

const RELATION_COPY = {
  like: "喜欢，就多揉一会儿。",
  dislike: "别生气，把烦恼捏成团。",
  fictional: "故事里的人，也可以软一点。",
  self: "照顾自己，也可以从捏捏开始。",
};

export function IntroPanel() {
  const recipe = useSquishStore((state) => state.recipe);
  const started = useSquishStore((state) => state.started);
  const lastPart = useSquishStore((state) => state.lastPart);
  const setStarted = useSquishStore((state) => state.setStarted);
  const openCustomizer = useSquishStore((state) => state.openCustomizer);

  return (
    <div className="relative z-10 px-0 text-center lg:pl-3 lg:text-left">
      <p className="mb-6 text-xs font-semibold tracking-[0.24em] text-accent lg:mb-6.5">
        {started ? `刚刚捏了${lastPart}` : "今天想捏谁？"}
      </p>
      <h1 className="m-0 font-serif-cn text-[46px] leading-[1.16] font-normal tracking-[-0.06em] sm:text-[54px] lg:text-[clamp(56px,5.2vw,88px)]">
        {started ? (
          <>
            再大的情绪，
            <br />
            也能捏成团。
          </>
        ) : (
          <>
            把情绪，
            <br />
            揉软一点。
          </>
        )}
      </h1>
      <p className="my-5 min-h-14 text-sm leading-8 tracking-[0.08em] text-muted lg:my-7">
        {started ? (
          RELATION_COPY[recipe.relation]
        ) : (
          <>
            做一只属于你的软软替身。
            <br />
            不用着急，捏一会儿就好。
          </>
        )}
      </p>
      <div className="flex items-center justify-center gap-3 lg:justify-start">
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="h-12 cursor-pointer rounded-full border border-ink bg-transparent px-5 text-sm transition duration-200 hover:-translate-y-0.5 hover:bg-ink hover:text-paper"
        >
          开始捏捏 <span className="ml-5">→</span>
        </button>
        <button
          type="button"
          onClick={openCustomizer}
          className="flex h-12 cursor-pointer items-center gap-1.5 border-0 bg-transparent px-4 text-xs text-muted transition hover:text-ink"
        >
          <SlidersHorizontal size={15} />
          先做一个人
        </button>
      </div>
    </div>
  );
}
