import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../builds";
import type { MatchEvent } from "./events";
import { Match, type Entry } from "./match";
import { STEP } from "./tuning";

const ENTRIES: Entry[] = BUILD_IDS.map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: i === 0 ? 0 : null }));

/** Player 0 with the ball, `at` from the rim straight out front and running at it, the others far off and still. */
function setUp(at: { x: number; z: number; vz: number }, clock: number): Match {
  const m = new Match({ entries: ENTRIES, seed: 3, firstOffence: 0 });
  while (m.phase !== "live") m.step(STEP);
  m.athletes.forEach((a, i) => Object.assign(a, { x: i === 0 ? at.x : -6 + i, z: i === 0 ? at.z : 11, vx: 0, vz: i === 0 ? at.vz : 0, auto: false, move: { x: 0, z: 0 }, action: { kind: "none" } }));
  m.ball.holder = 0;
  m.ball.mode = "held";
  m.shotClock = clock;
  return m;
}

function run(m: Match, seconds: number, each?: (t: number) => void): MatchEvent[] {
  const out: MatchEvent[] = [];
  for (let t = 0; t < seconds; t += STEP) {
    each?.(t);
    m.step(STEP);
    out.push(...m.drainEvents());
  }
  return out;
}

/**
 * The owner's glitch: a layup sometimes cut off mid move. The shot clock
 * ran out in the half second of the gather, knocked the ball loose, and
 * the body went on up into an empty layup. A shot in its motion now
 * beats the clock.
 */
describe("the shot clock and a shot already in its motion", () => {
  it("lets a layup gathered as the clock runs out leave the hands, with no violation first", () => {
    const m = setUp({ x: 0.5, z: 4, vz: -4 }, 0.25);
    m.press(0, "shoot");
    expect(m.athletes[0]!.action.kind).toBe("drive");
    const events = run(m, 1.5);
    const shot = events.findIndex((e) => e.type === "shot" || e.type === "dunk" || e.type === "dunkFail");
    const violation = events.findIndex((e) => e.type === "violation");
    expect(shot).toBeGreaterThanOrEqual(0);
    expect(violation === -1 || violation > shot).toBe(true);
  });

  it("lets a jumper rising as the clock runs out go up", () => {
    const m = setUp({ x: 0, z: 7.5, vz: 0 }, 0.15);
    m.press(0, "shoot");
    expect(m.athletes[0]!.action.kind).toBe("shoot");
    const events = run(m, 1.2, (t) => {
      if (t > 0.55 && m.athletes[0]!.action.kind === "shoot") m.release(0, 550);
    });
    expect(events.some((e) => e.type === "shot")).toBe(true);
    expect(events.findIndex((e) => e.type === "violation")).toBe(-1);
  });

  it("still calls the violation on a man just holding the ball", () => {
    const m = setUp({ x: 0, z: 7.5, vz: 0 }, 0.1);
    const events = run(m, 0.5);
    expect(events.some((e) => e.type === "violation")).toBe(true);
  });

  it("holds for a person's press at the rim while it is read, then the layup goes up", () => {
    const m = setUp({ x: 0.4, z: 3.6, vz: -3.5 }, 0.05);
    m.finishTaps = true;
    m.press(0, "shoot");
    expect(m.pickUps.has(0)).toBe(true);
    const events = run(m, 1.6);
    const shot = events.findIndex((e) => e.type === "shot");
    const violation = events.findIndex((e) => e.type === "violation");
    expect(shot).toBeGreaterThanOrEqual(0);
    expect(violation === -1 || violation > shot).toBe(true);
  });
});
