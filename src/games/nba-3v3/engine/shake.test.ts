import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../builds";
import { contestFor } from "./contest";
import { stun } from "./juke";
import { Match, type Entry } from "./match";
import { reactFor } from "./shake";
import { STEP } from "./tuning";
import { DRIBBLE_MOVES, type Action } from "./types";

type Move = Extract<Action, { kind: "move" }>;

const ENTRIES: Entry[] = BUILD_IDS.slice(0, 6).map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: i === 0 ? 1 : null }));

/** Player 0 with the ball at the top facing the rim, defender 1 a step in front, everyone else far off. */
function setup(seed = 1): Match {
  const m = new Match({ entries: ENTRIES, seed, firstOffence: 0 });
  while (m.phase !== "live") m.step(STEP);
  m.athletes.forEach((a, i) => Object.assign(a, { x: -6 + i * 2.4, z: 10.8, vx: 0, vz: 0, y: 0, auto: false, move: { x: 0, z: 0 }, action: { kind: "none" } }));
  Object.assign(m.athletes[0]!, { x: 0, z: 8, yaw: Math.PI, dribbleHand: 1, dribbleSide: 1 });
  Object.assign(m.athletes[1]!, { x: 0, z: 6.9, yaw: 0 });
  m.ball.holder = 0;
  m.ball.mode = "held";
  m.shotClock = 99;
  return m;
}

const move = (kind: Move["move"], side: 1 | -1, dir: { x: number; z: number }): Move => ({ kind: "move", t: 0, move: kind, dur: 0.4, side, dir, resolved: false });

describe("shaking a defender", () => {
  it("plays a reaction made for each move", () => {
    expect(reactFor("stepback", false)).toBe("bite");
    expect(reactFor("hesitation", true)).toBe("freeze");
    expect(reactFor("crossover", false)).toBe("slip");
    expect(reactFor("crossover", true)).toBe("ankles");
    expect(reactFor("spin", true)).toBe("turned");
    for (const k of DRIBBLE_MOVES) expect(reactFor(k, true)).toBeTruthy();
  });

  it("a bite lunges at the handler; a freeze plants him where he stands", () => {
    const m = setup();
    const [a, d] = [m.athletes[0]!, m.athletes[1]!];
    stun(d, move("stepback", 1, { x: 0, z: 1 }), true, a);
    expect(d.action).toMatchObject({ kind: "stumble", react: "bite" });
    expect(d.vz).toBeGreaterThan(1);
    stun(d, move("hesitation", 1, { x: 0, z: -1 }), true, a);
    expect(d.action).toMatchObject({ kind: "stumble", react: "freeze" });
    expect(Math.hypot(d.vx, d.vz)).toBe(0);
  });

  it("opens space: a shaken man barely contests the jumper that follows", () => {
    const m = setup();
    const [a, d] = [m.athletes[0]!, m.athletes[1]!];
    const honest = contestFor(a, [d], "jumper").contest;
    stun(d, move("crossover", 1, { x: 1, z: 0 }), true, a);
    expect(contestFor(a, [d], "jumper").contest).toBeLessThan(honest * 0.4);
  });

  it("flows a Shoot pressed early in the move straight into the jumper", () => {
    const m = setup();
    const a = m.athletes[0]!;
    m.athletes[1]!.x = 4;
    m.press(0, "defend", { x: 1, z: 0 });
    m.step(STEP);
    m.press(0, "shoot");
    // Too early to shoot out of yet: the press waits on the move instead of being dropped.
    expect(a.action.kind).toBe("move");
    let shotAt = -1;
    for (let t = 0; t < 0.5 && shotAt < 0; t += STEP) {
      m.step(STEP);
      if (a.action.kind === "shoot") shotAt = t;
    }
    expect(shotAt).toBeGreaterThan(0);
    // It picks up the move's rhythm: the dip is already partly done.
    expect(a.action.kind === "shoot" && a.action.t).toBeGreaterThan(0.1);
  });

  it("lets a quick tap during the move go up and out in one motion", () => {
    const m = setup();
    const a = m.athletes[0]!;
    m.athletes[1]!.x = 4;
    m.press(0, "defend", { x: -1, z: 0 });
    m.press(0, "shoot");
    m.release(0, 120);
    let shot = false;
    for (let t = 0; t < 0.6 && !shot; t += STEP) {
      m.step(STEP);
      shot = m.drainEvents().some((e) => e.type === "shot");
    }
    expect(shot).toBe(true);
    expect(a.action.kind).toBe("shoot");
  });
});
