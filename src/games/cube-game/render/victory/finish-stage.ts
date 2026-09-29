import type { Metal, OrbitShot } from "@/games/kit/victory";

/** One player's end of the round, as the results know it. */
export interface Finisher {
  slot: number;
  place: number;
  finished: boolean;
}

/**
 * What the celebration stands on. A race with a winner gets the podium,
 * first and second, each with a cup when anyone made it to the end. A
 * player alone, or a dead heat, shares one round pedestal with a gold cup.
 */
export type Stand =
  | { kind: "podium"; places: readonly { slot: number; place: 1 | 2; cup: Metal | null }[] }
  | { kind: "pedestal"; slots: readonly number[]; cup: boolean };

export function standFor(rows: readonly Finisher[]): Stand {
  const anyone = rows.some((row) => row.finished);
  const first = rows[0];
  if (!first || rows.length === 1 || rows.every((row) => row.place === first.place)) {
    return { kind: "pedestal", slots: rows.map((row) => row.slot), cup: anyone };
  }
  const order = [...rows].sort((a, b) => a.place - b.place || a.slot - b.slot).slice(0, 2);
  return { kind: "podium", places: order.map((row, i) => ({ slot: row.slot, place: i === 0 ? 1 : 2, cup: anyone ? (i === 0 ? "gold" : "silver") : null })) };
}

/** A hop every this many seconds, like the jumps the level asked for. */
const EVERY = 1.7;
/** Seconds in the air, and how high. */
const AIR = 0.55;
const HEIGHT = 0.75;

/**
 * The winner's hop, `t` seconds in: up and down in a parabola, turning
 * half a circle in the air as the cube does in the game, so it always
 * lands flat. `angle` keeps adding up, one half turn per hop.
 */
export function hop(t: number): { lift: number; angle: number } {
  const n = Math.floor(Math.max(0, t) / EVERY);
  const p = Math.min(1, (Math.max(0, t) - n * EVERY) / AIR);
  const turn = p * p * (3 - 2 * p);
  return { lift: 4 * HEIGHT * p * (1 - p), angle: -Math.PI * (n + turn) };
}

/**
 * The circling shot. It stands back so the top of a hop stays under the
 * names across the top, and the podium's steps show under the cubes.
 */
export function finishShot(stand: Stand): Partial<OrbitShot> {
  const podium = stand.kind === "podium";
  return {
    centre: { x: 0, y: 0, z: 0 },
    radius: podium ? 8.4 : 7,
    height: podium ? 2.3 : 1.9,
    lookHeight: podium ? 2.15 : 1.95,
    startAngle: 0,
    speed: 0.1,
    arc: 0.35,
    introS: 2.4,
    pullBack: 1.45,
    rise: 1.8,
    bob: 0.15,
  };
}
