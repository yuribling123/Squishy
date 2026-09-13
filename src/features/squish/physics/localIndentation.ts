// Computes volume-aware silicone indentation and softly underdamped spring recovery.
export type SpringSample = { displacement: number; velocity: number };

export function dragDeformationWeight(distanceSquared: number, radius: number) {
  if (distanceSquared >= radius * radius) return 0;
  const normalizedDistance = Math.sqrt(distanceSquared) / radius;
  const smoothDistance = 1 - normalizedDistance * normalizedDistance;
  return smoothDistance * smoothDistance * (1 + 2 * normalizedDistance);
}

export function siliconeDeformationWeight(distanceSquared: number, radius: number, facing = 1) {
  if (distanceSquared >= radius * radius || facing <= 0) return 0;
  const normalizedDistance = Math.sqrt(distanceSquared) / radius;
  const compactDistance = 1 - normalizedDistance * normalizedDistance;
  const indentation = compactDistance * compactDistance * compactDistance;
  const ringProgress = Math.max(0, Math.min(1, (normalizedDistance - 0.5) / 0.5));
  const displacedVolume = Math.sin(Math.PI * ringProgress) ** 2 * 0.115;
  return (indentation - displacedVolume) * Math.min(1, facing * 2.4);
}

export function springCoefficients(rebound: number, reducedMotion = false) {
  const frequency = 12 + Math.max(0, Math.min(100, rebound)) * 0.065;
  return { stiffness: frequency * frequency, damping: 2 * frequency * (reducedMotion ? 1 : 0.82) };
}

export function stepSpring(sample: SpringSample, target: number, delta: number, rebound = 38) {
  const { stiffness, damping } = springCoefficients(rebound);
  const steps = Math.max(1, Math.ceil(Math.min(delta, 0.05) / (1 / 120)));
  const dt = Math.min(delta, 0.05) / steps;
  let { displacement, velocity } = sample;
  for (let step = 0; step < steps; step++) {
    velocity += ((target - displacement) * stiffness - velocity * damping) * dt;
    displacement += velocity * dt;
  }
  return { displacement, velocity };
}
