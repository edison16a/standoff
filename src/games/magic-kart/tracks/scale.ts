import type { ControlPoint } from "./types";

/** Maps are sketched on a small grid and scaled up, which keeps the numbers easy to read. */
export function scalePoints(points: readonly ControlPoint[], k: number, lift = 1): ControlPoint[] {
  return points.map(([x, z, y]) => [x * k, z * k, (y ?? 0) * lift] as const);
}
