// Loads and saves avatar recipes in browser storage.
import type { AvatarRecipe } from "../domain/avatar.types";

const STORAGE_KEY = "slow-squish-characters";
const MAX_SAVED_CHARACTERS = 6;

export function loadCharacters(): AvatarRecipe[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const characters = JSON.parse(raw) as AvatarRecipe[];
    return Array.isArray(characters) ? characters : [];
  } catch {
    return [];
  }
}

export function saveCharacter(
  character: AvatarRecipe,
  existing: AvatarRecipe[],
): AvatarRecipe[] {
  const nextCharacters = [
    character,
    ...existing.filter((item) => item.name !== character.name),
  ].slice(0, MAX_SAVED_CHARACTERS);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextCharacters));
  return nextCharacters;
}
