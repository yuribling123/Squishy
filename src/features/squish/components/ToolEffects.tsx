// Draws a brief whip trail along a successful swipe without intercepting canvas input.
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useSquishStore } from "../store/useSquishStore";

export function ToolEffects({ children }: { children: ReactNode }) {
  const pathRef = useRef<SVGPathElement>(null);
  const gesture = useRef({ x: 0, y: 0, endX: 0, endY: 0 });
  const impact = useSquishStore((state) => state.impact);

  useEffect(() => {
    const path = pathRef.current;
    if (!path || impact.id === 0) return;
    const { x, y, endX, endY } = gesture.current;
    path.setAttribute("d", `M${x} ${y} Q${(x + endX) / 2 + 45} ${Math.min(y, endY) - 45} ${endX} ${endY}`);
    const animation = path.animate(
      [{ opacity: 0.85 }, { opacity: 0 }],
      { duration: 320, easing: "ease-out" },
    );
    return () => animation.cancel();
  }, [impact]);

  return (
    <div
      className="absolute inset-0"
      onPointerDownCapture={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        gesture.current = { x: event.clientX - rect.left, y: event.clientY - rect.top, endX: event.clientX - rect.left, endY: event.clientY - rect.top };
      }}
      onPointerUpCapture={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        gesture.current.endX = event.clientX - rect.left;
        gesture.current.endY = event.clientY - rect.top;
      }}
    >
      {children}
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible motion-reduce:hidden">
        <path ref={pathRef} fill="none" stroke="#876778" strokeWidth="5" strokeLinecap="round" opacity="0" />
      </svg>
    </div>
  );
}
