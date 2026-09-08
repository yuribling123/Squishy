// Defines default avatar settings and available customization choices.
import type { AvatarRecipe, AvatarRelation } from "./avatar.types";

export const DEFAULT_AVATAR: AvatarRecipe = {
  name: "小团",
  relation: "self",
  skin: "#efad83",
  hairColor: "#463a31",
  outfitColor: "#463a31",
  hairStyle: 0,
  headSize: 1,
  bodySize: 1,
  height: 1,
  eyeSize: 1,
};

export const RELATION_OPTIONS: Array<{
  id: AvatarRelation;
  label: string;
}> = [
  { id: "like", label: "喜欢的人" },
  { id: "dislike", label: "讨厌的人" },
  { id: "self", label: "我自己" },
  { id: "fictional", label: "虚构角色" },
];

export const HAIR_STYLES = ["短发", "蘑菇头", "小揪揪"];
export const SKIN_COLORS = ["#efad83", "#f4c5a6", "#d9956c", "#a96745", "#71452f"];
export const HAIR_COLORS = ["#463a31", "#201d1b", "#8a5138", "#d6ae68", "#815d8d"];
export const OUTFIT_COLORS = ["#aa9674", "#768c7a", "#c27f77", "#68768b", "#aa91ad"];
