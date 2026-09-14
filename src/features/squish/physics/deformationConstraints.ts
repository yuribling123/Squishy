// Applies smooth global safety limits without introducing per-vertex discontinuities.
export function deformationDepthWeight(axialDistance: number, radius: number) {
  const normalized = Math.abs(axialDistance) / (radius * 0.62);
  if (normalized >= 1) return 0;
  const smooth = 1 - normalized * normalized;
  return smooth * smooth;
}

export function safeIndentationDepth(depth: number, radius: number) {
  const limit = radius * 0.72;
  return limit * Math.tanh(depth / limit);
}
