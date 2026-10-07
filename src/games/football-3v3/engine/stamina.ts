import type { Athlete } from "./types";

/**
 * Legs that tire. Running drains stamina and sprinting drains it much
 * faster; walking and standing win it back, and so does the break
 * between plays. Above `tired` a player runs as normal; below it his
 * top speed sinks toward `floor` of itself, so a long run ends slower
 * than it started and a man who sprinted every play has less left.
 */
export const STAMINA = {
  /** Lost per second at a flat out sprint, at a steady run, and gained walking, standing and between plays. */
  sprint: 0.11,
  run: 0.035,
  walk: 0.05,
  rest: 0.09,
  between: 0.1,
  /** Rushing off the edge burns it faster still. */
  rushing: 1.5,
  /** Below this the legs start to go. */
  tired: 0.55,
  /** Top speed at no stamina at all, as a share of fresh. */
  floor: 0.72,
} as const;

/**
 * One step of a player's stamina. `ratio` is his speed over his fresh
 * top speed; `live` is false between plays, when everyone gets breath back.
 */
export function updateStamina(a: Athlete, ratio: number, live: boolean, dt: number): void {
  let rate: number;
  if (!live) rate = STAMINA.between;
  else if (ratio >= 0.8) rate = -STAMINA.sprint * (a.rushT > 0 ? STAMINA.rushing : 1);
  else if (ratio >= 0.45) rate = -(STAMINA.run + ((ratio - 0.45) / 0.35) * (STAMINA.sprint - STAMINA.run) * 0.5);
  else if (ratio >= 0.12) rate = STAMINA.walk;
  else rate = STAMINA.rest;
  a.stamina = Math.min(1, Math.max(0, a.stamina + rate * dt));
}

/** Share of fresh top speed the legs give now: 1 until tired, down to the floor when empty. */
export function staminaPace(a: Pick<Athlete, "stamina">): number {
  const k = Math.min(1, a.stamina / STAMINA.tired);
  return STAMINA.floor + (1 - STAMINA.floor) * k;
}
