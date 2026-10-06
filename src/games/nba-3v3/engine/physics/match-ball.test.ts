import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../../builds";
import { Match, type Entry } from "../match";
import { BOARD, RIM, STEP } from "../tuning";
import { finiteBody } from "./air";
import { BALL } from "./ball-spec";

const BOTS: Entry[] = BUILD_IDS.slice(0, 6).map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: null }));

/** Plays whole computer games and checks the ball after every step. */
function watch(seed: number): { steps: number; bad: string[]; events: Map<string, number> } {
  const m = new Match({ entries: BOTS, seed });
  const bad: string[] = [];
  const events = new Map<string, number>();
  let steps = 0;
  const touch = BALL.radius + RIM.tube;
  for (let t = 0; t < 900 && m.phase !== "over"; t += STEP) {
    m.step(STEP);
    steps++;
    for (const e of m.drainEvents()) events.set(e.type, (events.get(e.type) ?? 0) + 1);
    const b = m.ball;
    if (!finiteBody(b)) bad.push(`NaN at ${m.time}`);
    if (b.mode === "held") continue;
    const { pos } = b;
    const hl = Math.hypot(pos.x - RIM.x, pos.z - RIM.z);
    if (Math.hypot(hl - RIM.radius, pos.y - RIM.y) < touch - 3e-3) bad.push(`in the iron at ${m.time}`);
    if (pos.y < BALL.radius - 3e-3) bad.push(`under the floor at ${m.time}`);
    const glass = Math.abs(pos.x - RIM.x) < BOARD.halfWidth && pos.y > BOARD.bottom && pos.y < BOARD.top;
    if (glass && pos.z > BOARD.face - BOARD.thickness - BALL.radius + 3e-3 && pos.z < BOARD.face + BALL.radius - 3e-3) bad.push(`in the glass at ${m.time}`);
  }
  return { steps, bad, events };
}

describe("the ball through whole games", () => {
  it("never goes NaN, never sinks into the iron, the glass or the floor, and the game runs to the end", () => {
    for (const seed of [21, 22, 23]) {
      const { bad, events } = watch(seed);
      expect(bad.slice(0, 3)).toEqual([]);
      expect(events.get("win")).toBe(1);
      expect(events.get("bounce") ?? 0).toBeGreaterThan(50);
    }
  }, 120000);
});
