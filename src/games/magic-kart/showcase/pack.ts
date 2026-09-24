import type { Kart } from "../engine/kart";
import type { RaceWorld } from "../engine/world";

/**
 * Keeps the showcase's computer karts in a tight pack: the leader eases
 * off and the back pushes on, much harder than in a real race, so every
 * second on camera is close racing with throws landing.
 */
export function keepPackTogether(world: RaceWorld): void {
  if (world.phase !== "racing") return;
  const mean = world.karts.reduce((sum, k) => sum + k.race.progress, 0) / world.karts.length;
  for (const kart of world.karts) kart.speedBias = 1 + Math.max(-0.1, Math.min(0.12, (mean - kart.race.progress) / 50));
}

/** The middle of the leading group, and the leader. Karts far behind are left out so the shot stays tight. */
export function packFocus(world: RaceWorld): { x: number; y: number; z: number; lead: Kart } {
  const lead = world.standings[0]!;
  const group = world.karts.filter((k) => lead.race.progress - k.race.progress < 22);
  const n = group.length;
  return {
    x: group.reduce((sum, k) => sum + k.x, 0) / n,
    y: group.reduce((sum, k) => sum + k.y, 0) / n,
    z: group.reduce((sum, k) => sum + k.z, 0) / n,
    lead,
  };
}
