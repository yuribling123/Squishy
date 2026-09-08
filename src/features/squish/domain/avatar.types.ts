// Defines the avatar recipe, relationship, and material types.
export type AvatarRelation = "like" | "dislike" | "self" | "fictional";

export type MaterialKind = "mochi" | "cream" | "jelly" | "rubber";

export type AvatarRecipe = {
  name: string;
  relation: AvatarRelation;
  skin: string;
  hairColor: string;
  outfitColor: string;
  hairStyle: number;
  headSize: number;
  bodySize: number;
  height: number;
  eyeSize: number;
};
