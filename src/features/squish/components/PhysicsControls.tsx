// Provides controls for avatar softness and rebound speed.
"use client";

import { RangeControl } from "@/components/ui/RangeControl";
import { useSquishStore } from "../store/useSquishStore";

export function PhysicsControls() {
  const softness = useSquishStore((state) => state.softness);
  const rebound = useSquishStore((state) => state.rebound);
  const setSoftness = useSquishStore((state) => state.setSoftness);
  const setRebound = useSquishStore((state) => state.setRebound);

  const softnessNote =
    softness > 68 ? "软趴趴" : softness > 38 ? "软糯" : "紧实";
  const reboundNote =
    rebound > 65 ? "弹回来" : rebound > 35 ? "慢慢来" : "留个印";

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-8">
      <RangeControl
        label="软硬度"
        note={softnessNote}
        min={10}
        max={90}
        value={softness}
        onChange={setSoftness}
      />
      <RangeControl
        label="回弹速度"
        note={reboundNote}
        min={10}
        max={90}
        value={rebound}
        onChange={setRebound}
      />
    </div>
  );
}
