// Defines the available playground tools and their usage hints.
export type PlaygroundTool = "squish" | "heart" | "whip";

export const PLAYGROUND_TOOLS = [
  { id: "squish", label: "捏捏", hint: "按住小人拖一拖，松手慢慢回弹。" },
  { id: "heart", label: "贴贴", hint: "点一下小人，把爱心贴在 TA 身上。" },
  { id: "whip", label: "抽抽", hint: "从小人身上划一下，试试软鞭。" },
] as const;
