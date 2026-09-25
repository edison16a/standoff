import { describe, expect, it } from "vitest";
import { CHARACTER_IDS } from "../roster";
import type { MatchEvent } from "./events";
import { callFoul } from "./free-throw";
import { LINE } from "./free-throw-plan";
import { Match, type Entry } from "./match";
import { GREEN_MS } from "./shot-model";
import { COURT, STEP } from "./tuning";

/** Player 0 is on a phone in seat 1; everyone else is a computer. */
const ENTRIES: Entry[] = CHARACTER_IDS.slice(0, 6).map((character, i) => ({ team: (i % 2) as 0 | 1, character, seat: i === 0 ? 1 : null }));

/** A live match where defender 1 has just fouled player `victim` of team 0. */
function fouled(victim: number, seed = 3): { m: Match; events: MatchEvent[] } {
  const m = new Match({ entries: ENTRIES, seed, firstOffence: 0 });
  while (m.phase !== "live") m.step(STEP);
  const a = m.athletes[victim]!;
  a.action = { kind: "none" };
  Object.assign(m.athletes[1]!, { x: a.x, z: a.z - 0.9, action: { kind: "none" } });
  m.ball.holder = victim;
  m.ball.mode = "held";
  m.shotClock = 7.5;
  m.needsClear = true;
  callFoul(m, m.athletes[1]!, a);
  return { m, events: m.drainEvents() };
}

/** Steps until `done`, gathering events, for at most `max` seconds. */
function until(m: Match, events: MatchEvent[], done: () => boolean, max = 12): void {
  for (let t = 0; t < max && !done(); t += STEP) {
    m.step(STEP);
    events.push(...m.drainEvents());
  }
}

describe("a foul and its free throws", () => {
  it("stops the clock, walks everyone to the lane and lets a computer shoot both", () => {
    const { m, events } = fouled(2);
    expect(events.some((e) => e.type === "foul" && e.id === 1 && e.victim === 2)).toBe(true);
    expect(m.phase).toBe("freeThrow");
    // The fouled team restarts from the line: no clear left to make, and no warning on the phone.
    expect(m.needsClear).toBe(false);
    until(m, events, () => events.some((e) => e.type === "freeThrow"));
    // At the line with the clock where it stopped, and nobody inside the key.
    const shooter = m.athletes[2]!;
    expect(Math.hypot(shooter.x - LINE.x, shooter.z - LINE.z)).toBeLessThan(0.5);
    expect(m.shotClock).toBe(7.5);
    for (const a of m.athletes) if (a !== shooter) expect(Math.abs(a.x)).toBeGreaterThan(COURT.keyHalfWidth - 0.2);
    const before = m.score[0];
    until(m, events, () => m.phase !== "freeThrow");
    const shots = events.filter((e) => e.type === "shot" && e.kind === "free");
    expect(shots.length).toBe(2);
    expect(events.filter((e) => e.type === "freeThrow").map((e) => (e.type === "freeThrow" ? e.n : 0))).toEqual([1, 2]);
    // Play is live again as the second leaves the hand.
    expect(m.phase).toBe("live");
    until(m, events, () => m.ball.mode !== "flight" || m.phase !== "live");
    const made = events.filter((e) => e.type === "score" && e.kind === "free");
    for (const e of made) if (e.type === "score") expect(e.points).toBe(1);
    expect(m.score[0] - before).toBe(made.length);
  });

  it("gives a phone player their own two shots on the meter, a point each", () => {
    const { m, events } = fouled(0);
    until(m, events, () => events.some((e) => e.type === "freeThrow"));
    // Other buttons do nothing at the line.
    m.press(0, "pass");
    m.press(0, "defend");
    expect(m.athletes[0]!.action.kind).toBe("none");
    m.forced = "swish";
    m.press(0, "shoot");
    until(m, events, () => (m.athletes[0]!.action.kind === "shoot" ? m.athletes[0]!.action.t * 1000 >= GREEN_MS : true));
    m.release(0, GREEN_MS);
    until(m, events, () => events.filter((e) => e.type === "freeThrow").length === 2);
    expect(m.score[0]).toBe(1);
    expect(m.phase).toBe("freeThrow");
    m.forced = "swish";
    m.press(0, "shoot");
    until(m, events, () => (m.athletes[0]!.action.kind === "shoot" ? m.athletes[0]!.action.t * 1000 >= GREEN_MS : true));
    m.release(0, GREEN_MS);
    until(m, events, () => m.phase === "dead");
    expect(m.score[0]).toBe(2);
    // A make on the second is like any basket: the other team checks it up.
    expect(m.nextOffence).toBe(1);
  });

  it("leaves a missed second free throw live for the rebound", () => {
    const { m, events } = fouled(0);
    m.stealLog.attempt(1, 0);
    until(m, events, () => events.some((e) => e.type === "freeThrow"));
    m.forced = "rimOut";
    m.press(0, "shoot");
    m.release(0, GREEN_MS);
    until(m, events, () => events.filter((e) => e.type === "freeThrow").length === 2);
    m.forced = "rimOut";
    m.press(0, "shoot");
    until(m, events, () => m.athletes[0]!.action.kind === "shoot" && m.athletes[0]!.action.t > 0.6);
    m.release(0, GREEN_MS);
    // The foul closed that possession: whoever rebounds, the reach count starts over.
    until(m, events, () => m.phase === "live");
    expect(m.stealLog.count(1, 0)).toBe(0);
    until(m, events, () => events.some((e) => e.type === "rebound"));
    expect(m.phase).toBe("live");
    expect(m.score).toEqual([0, 0]);
    expect(events.some((e) => e.type === "rebound")).toBe(true);
  });

  it("ends the game when a free throw reaches the target", () => {
    const { m, events } = fouled(2);
    m.score[0] = m.target - 1;
    m.forced = "swish";
    until(m, events, () => m.phase === "over");
    expect(m.winner).toBe(0);
    expect(m.freeThrows).toBeNull();
  });
});
