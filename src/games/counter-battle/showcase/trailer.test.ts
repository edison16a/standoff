import { describe, expect, it } from "vitest";
import type { BattleEvent } from "../engine/events";
import { STEP } from "../engine/tuning";
import { SEED, showcaseBattle } from "./script";
import { FILM_LENGTH, filmAt, SHOTS, shotLength } from "./trailer";

/** Plays the showcase fight to `until` seconds, noting when each event happened. */
function play(until: number) {
  const battle = showcaseBattle(SEED);
  const log: { at: number; e: BattleEvent }[] = [];
  while (battle.time < until - 1e-9) for (const e of battle.step()) log.push({ at: battle.time, e });
  return log;
}

const FRAME = 1 / 30;
const covered = (at: number) => SHOTS.some((s) => at >= s.from && at <= s.to);

// The trailer was filmed from this exact fight. An engine or bot change that moves it
// fails here, as a reminder to pick new moments and film the media again.
describe("paintball trailer", () => {
  const log = play(SHOTS[SHOTS.length - 1]!.to);
  const kills = log.filter((l) => l.e.type === "kill" && l.at > SHOTS[0]!.from);

  it("fills the eight second clip and the second the capture blends over its start", () => {
    expect(FILM_LENGTH).toBeCloseTo(9, 6);
    expect(filmAt(0).index).toBe(0);
    expect(filmAt(FILM_LENGTH - 0.01).index).toBe(SHOTS.length - 1);
  });

  it("only runs forward, and moves whole engine steps each filmed frame so no frame is held", () => {
    for (const [i, s] of SHOTS.entries()) {
      expect(s.to).toBeGreaterThan(s.from);
      if (i > 0) expect(s.from).toBeGreaterThanOrEqual(SHOTS[i - 1]!.to - 1e-9);
      const steps = (FRAME * s.rate) / STEP;
      expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-9);
      expect(shotLength(s)).toBeLessThan(2);
    }
  });

  it("shows both kills of the round, each in slow motion", () => {
    expect(kills.map((k) => k.e)).toMatchObject([
      { type: "kill", killer: 0, victim: 3, head: true },
      { type: "kill", killer: 1, victim: 2, gun: "shotgun" },
    ]);
    for (const k of kills) expect(SHOTS.find((s) => k.at >= s.from && k.at <= s.to)?.rate).toBe(0.5);
  });

  it("catches Blaze taking paint on his sprint and trading it with Vex in his charge", () => {
    const hits = log.filter((l) => l.e.type === "hit" && covered(l.at));
    expect(hits.filter((h) => h.e.type === "hit" && h.e.target === 1).length).toBeGreaterThanOrEqual(5);
    expect(hits.some((h) => h.e.type === "hit" && h.e.shooter === 1 && h.e.head)).toBe(true);
  });

  it("ends on the round won", () => {
    const end = log.find((l) => l.e.type === "round-end" && l.at > SHOTS[0]!.from)!;
    expect(end.e).toMatchObject({ winner: 0 });
    expect(end.at).toBeLessThan(SHOTS[SHOTS.length - 1]!.from + 0.1);
  });
});
