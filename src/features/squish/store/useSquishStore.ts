// Manages shared avatar settings and squish interaction state.
"use client";

import { create } from "zustand";
import { DEFAULT_AVATAR } from "../domain/avatar.defaults";
import type { AvatarRecipe, MaterialKind } from "../domain/avatar.types";
import { saveCharacter } from "../services/characterStorage";
import type { PlaygroundTool } from "../domain/tools";

type SquishState = {
  tool: PlaygroundTool;
  setTool: (tool: PlaygroundTool) => void;
  impact: { id: number; direction: number; strength: number };
  strike: (direction: number, strength: number) => void;
  recipe: AvatarRecipe;
  draft: AvatarRecipe;
  savedCharacters: AvatarRecipe[];
  material: MaterialKind;
  softness: number;
  rebound: number;
  soundOn: boolean;
  customizing: boolean;
  started: boolean;
  studioMode: "edit" | "play";
  setStudioMode: (mode: "edit" | "play") => void;
  resetKey: number;
  squeezeCount: number;
  lastPart: string;
  hydrateCharacters: (characters: AvatarRecipe[]) => void;
  updateDraft: (changes: Partial<AvatarRecipe>) => void;
  updateRecipe: (changes: Partial<AvatarRecipe>) => void;
  loadDraft: (character: AvatarRecipe) => void;
  openCustomizer: () => void;
  closeCustomizer: () => void;
  saveDraft: () => void;
  setMaterial: (material: MaterialKind) => void;
  setSoftness: (softness: number) => void;
  setRebound: (rebound: number) => void;
  toggleSound: () => void;
  setStarted: (started: boolean) => void;
  resetAvatar: () => void;
  recordSqueeze: (part: string) => void;
};

export const useSquishStore = create<SquishState>((set, get) => ({
  tool: "squish",
  setTool: (tool) => set({ tool }),
  impact: { id: 0, direction: 1, strength: 0 },
  strike: (direction, strength) => set((state) => ({
    impact: { id: state.impact.id + 1, direction, strength },
  })),
  recipe: DEFAULT_AVATAR,
  draft: DEFAULT_AVATAR,
  savedCharacters: [],
  material: "mochi",
  softness: 56,
  rebound: 38,
  soundOn: true,
  customizing: false,
  started: false,
  studioMode: "edit",
  setStudioMode: (studioMode) => set({ studioMode }),
  resetKey: 0,
  squeezeCount: 0,
  lastPart: "脸颊",

  hydrateCharacters: (characters) => {
    if (!characters.length) return;
    set({ savedCharacters: characters, recipe: characters[0], draft: characters[0] });
  },
  updateDraft: (changes) =>
    set((state) => ({ draft: { ...state.draft, ...changes } })),
  updateRecipe: (changes) =>
    set((state) => ({ recipe: { ...state.recipe, ...changes } })),
  loadDraft: (character) => set({ draft: character }),
  openCustomizer: () =>
    set((state) => ({ draft: state.recipe, customizing: true })),
  closeCustomizer: () => set({ customizing: false }),
  saveDraft: () => {
    const state = get();
    const name = state.draft.name.trim() || "未命名软偶";
    const recipe = { ...state.draft, name };
    const savedCharacters = saveCharacter(recipe, state.savedCharacters);

    set((current) => ({
      recipe,
      draft: recipe,
      savedCharacters,
      customizing: false,
      resetKey: current.resetKey + 1,
    }));
  },
  setMaterial: (material) => set({ material }),
  setSoftness: (softness) => set({ softness }),
  setRebound: (rebound) => set({ rebound }),
  toggleSound: () => set((state) => ({ soundOn: !state.soundOn })),
  setStarted: (started) => set({ started }),
  resetAvatar: () => set((state) => ({ resetKey: state.resetKey + 1 })),
  recordSqueeze: (part) =>
    set((state) => ({
      started: true,
      lastPart: part,
      squeezeCount: state.squeezeCount + 1,
    })),
}));
