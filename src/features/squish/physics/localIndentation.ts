// Computes compact local indentation and stable, lightly damped spring recovery.
export type SpringSample = { displacement: number; velocity: number };

export function indentationWeight(distanceSquared: number, radius: number, facing = 1) {
  if (distanceSquared >= radius * radius || facing <= 0) return 0;
  const t = 1 - distanceSquared / (radius * radius);
  return t * t * t * Math.min(1, facing * 2);
}

export function springCoefficients(rebound: number, reducedMotion = false) {
  const frequency = 15 + Math.max(0, Math.min(100, rebound)) * 0.09;
  return { stiffness: frequency * frequency, damping: 2 * frequency * (reducedMotion ? 1 : 0.74) };
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
