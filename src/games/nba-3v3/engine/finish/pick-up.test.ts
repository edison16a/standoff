import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../../builds";
import { Match, type Entry } from "../match";
import { STEP } from "../tuning";
import type { V2 } from "../vec";
import { FINISH_TAPS, letGo, pressAgain, settle, type PickUp } from "./pick-up";

describe("the tap rules at the rim", () => {
  it("reads a hold as a layup once it has been down long enough", () => {
    const p: PickUp = { at: 0, up: null };
    expect(settle(p, FINISH_TAPS.hold - 0.01)).toBeNull();
    expect(settle(p, FINISH_TAPS.hold)).toBe("layup");
  });

  it("reads two quick presses as a dunk", () => {
    const p: PickUp = { at: 0, up: null };
    letGo(p, 0.08);
    expect(settle(p, 0.2)).toBeNull();
    expect(pressAgain(p, 0.2)).toBe("dunk");
  });

  it("reads one quick tap and nothing more as a layup, once the window shuts", () => {
    const p: PickUp = { at: 0, up: null };
    letGo(p, 0.06);
    expect(settle(p, FINISH_TAPS.double - 0.01)).toBeNull();
    expect(settle(p, FINISH_TAPS.double + 0.01)).toBe("layup");
  });

  it("never turns a hold into a dunk, or a late second press", () => {
    const held: PickUp = { at: 0, up: null };
    expect(pressAgain(held, 0.12)).toBeNull();
    const late: PickUp = { at: 0, up: 0.1 };
    expect(pressAgain(late, FINISH_TAPS.double + 0.02)).toBeNull();
  });
});

const ENTRIES: Entry[] = BUILD_IDS.map((build, i) => ({ team: (i % 2) as 0 | 1, build: i === 0 ? "dunker" : build === "dunker" ? "shooter" : build, seat: i === 0 ? 0 : null }));

/** A person (player 0) running at the rim with the ball, the tap rules on, everyone else far off and still. */
function person(at: V2 & { vz: number }, stick: V2 = { x: 0, z: -1 }): Match {
  const m = new Match({ entries: ENTRIES, seed: 9, firstOffence: 0 });
  m.finishTaps = true;
  while (m.phase !== "live") m.step(STEP);
  m.athletes.forEach((a, i) => Object.assign(a, { x: i === 0 ? at.x : -6 + i, z: i === 0 ? at.z : 11, vx: 0, vz: i === 0 ? at.vz : 0, auto: i !== 0, action: { kind: "none" } }));
  for (const a of m.athletes) if (a.id !== 0) a.move = { x: 0, z: 0 };
  m.ball.holder = 0;
  m.ball.mode = "held";
  m.forcedDunk = "make";
  m.setMove(0, stick);
  return m;
}

/** Steps the match, pressing and letting go of Shoot at the given times, until the finish starts. */
function play(m: Match, taps: readonly [down: number, up: number][]): string {
  for (let t = 0; t < 1.2; t += STEP) {
    for (const [down, up] of taps) {
      if (Math.abs(t - down) < STEP / 2) m.press(0, "shoot");
      if (Math.abs(t - up) < STEP / 2) m.release(0);
    }
    m.step(STEP);
    m.drainEvents();
    const act = m.athletes[0]!.action;
    if (act.kind === "drive") return act.dunk ? "dunk" : `layup:${act.layup}`;
    if (act.kind === "shoot") return act.float ? "floater" : "jumper";
  }
  return "nothing";
}

describe("Shoot at the rim for a person", () => {
  it("lays it up on a hold and dunks on a double tap", () => {
    expect(play(person({ x: 0.3, z: 4.2, vz: -4 }), [[0, 0.5]])).toMatch(/^layup:/);
    expect(play(person({ x: 0.3, z: 4.2, vz: -4 }), [[0, 0.07], [0.16, 0.22]])).toBe("dunk");
  });

  it("lays it up on a single tap too", () => {
    expect(play(person({ x: 0.3, z: 4.2, vz: -4 }), [[0, 0.06]])).toMatch(/^layup:/);
  });

  it("waits no longer than the double tap window to start the finish", () => {
    const m = person({ x: 0.3, z: 4.2, vz: -4 });
    m.press(0, "shoot");
    expect(m.athletes[0]!.action.kind).toBe("none");
    for (let t = 0; t < FINISH_TAPS.double + 2 * STEP; t += STEP) m.step(STEP);
    expect(m.athletes[0]!.action.kind).toBe("drive");
  });

  it("keeps the jumper and its meter away from the rim", () => {
    const m = person({ x: 0, z: 7.6, vz: 0 }, { x: 0, z: 0 });
    m.press(0, "shoot");
    expect(m.athletes[0]!.action.kind).toBe("shoot");
  });

  it("drops a press being read when the ball is lost", () => {
    const m = person({ x: 0.3, z: 4.2, vz: -4 });
    m.press(0, "shoot");
    m.ball.holder = null;
    m.ball.mode = "loose";
    m.step(STEP);
    expect(m.pickUps.size).toBe(0);
  });

  it("calls the finish at once for the computer", () => {
    const m = person({ x: 0.3, z: 4.2, vz: -4 });
    m.athletes[0]!.auto = true;
    m.press(0, "shoot");
    expect(m.athletes[0]!.action.kind).toBe("drive");
  });
});
