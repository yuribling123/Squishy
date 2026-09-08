// Defines material presets and resolves their appearance settings.
import type { MaterialKind } from "./avatar.types";

export type MaterialPreset = {
  id: MaterialKind;
  name: string;
  note: string;
  swatch: string;
  surface: {
    roughness: number;
    metalness: number;
    clearcoat: number;
    transmission: number;
    opacity: number;
  };
};

export const MATERIAL_PRESETS: MaterialPreset[] = [
  {
    id: "mochi",
    name: "糯米",
    note: "软糯 · 慢回弹",
    swatch: "#d5a15f",
    surface: { roughness: 0.56, metalness: 0, clearcoat: 0.2, transmission: 0, opacity: 1 },
  },
  {
    id: "cream",
    name: "奶油",
    note: "细腻 · 易凹陷",
    swatch: "#eadccb",
    surface: { roughness: 0.82, metalness: 0, clearcoat: 0.08, transmission: 0, opacity: 1 },
  },
  {
    id: "jelly",
    name: "果冻",
    note: "透亮 · 爱晃动",
    swatch: "#adcca1",
    surface: { roughness: 0.16, metalness: 0, clearcoat: 0.7, transmission: 0.24, opacity: 0.9 },
  },
  {
    id: "rubber",
    name: "橡胶",
    note: "紧实 · 快回弹",
    swatch: "#c1a2c8",
    surface: { roughness: 0.32, metalness: 0, clearcoat: 0.5, transmission: 0, opacity: 1 },
  },
];

export function getMaterialPreset(id: MaterialKind) {
  return MATERIAL_PRESETS.find((preset) => preset.id === id) ?? MATERIAL_PRESETS[0];
}
