import { describe, expect, it } from "vitest";
import { CHARACTER_IDS } from "../roster";
import { rimDistance } from "./court";
import type { MatchEvent } from "./events";
import { Match, type Entry } from "./match";
import { pickMove } from "./move-pick";
import { STEP } from "./tuning";
import type { Athlete } from "./types";

const ENTRIES: Entry[] = CHARACTER_IDS.slice(0, 6).map((character, i) => ({ team: (i % 2) as 0 | 1, character, seat: i === 0 ? 1 : null }));

/**
 * Player 0 on a phone with the ball at the top, facing the rim (toward
 * -z, so their right is +x), and defender 1 `gap` in front, a touch to
 * `side`. Everyone else is far off and still.
 */
function setup(seed = 2, gap = 1.3, side = 0): Match {
  const m = new Match({ entries: ENTRIES, seed, firstOffence: 0 });
  while (m.phase !== "live") m.step(STEP);
  m.athletes.forEach((a, i) => Object.assign(a, { x: -6 + i * 2.4, z: 10.8, vx: 0, vz: 0, y: 0, auto: false, move: { x: 0, z: 0 }, action: { kind: "none" } }));
  Object.assign(m.athletes[0]!, { x: 0, z: 8, yaw: Math.PI, dribbleHand: 1, dribbleSide: 1 });
  Object.assign(m.athletes[1]!, { x: side, z: 8 - gap, yaw: 0 });
  m.ball.holder = 0;
  m.ball.mode = "held";
  return m;
}

function run(m: Match, seconds: number, events: MatchEvent[] = []): MatchEvent[] {
  for (let t = 0; t < seconds; t += STEP) {
    m.step(STEP);
    events.push(...m.drainEvents());
  }
  return events;
}

const moveOf = (a: Athlete) => (a.action.kind === "move" ? a.action.move : null);

describe("dribble moves", () => {
  it("are picked by the stick against the way to the basket", () => {
    const m = setup();
    const a = m.athletes[0]!;
    const d = m.athletes[1]!;
    // The rim is toward -z from the top of the key.
    expect(pickMove(a, { x: 0, z: 1 }, d).move).toBe("stepback");
    expect(pickMove(a, { x: 0, z: -1 }, d).move).toBe("spin");
    expect(pickMove(a, { x: 1, z: 0 }, d)).toMatchObject({ move: "crossover", side: 1 });
    expect(pickMove(a, { x: -1, z: 0 }, d)).toMatchObject({ move: "crossover", side: -1 });
    // Neutral: a hesitation, or behind the back when the defender sits on the ball hand.
    d.x = -0.6;
    expect(pickMove(a, null, d).move).toBe("hesitation");
    d.x = 0.6;
    expect(pickMove(a, { x: 0.1, z: 0 }, d)).toMatchObject({ move: "behindBack", side: -1 });
  });

  it("turn the third button into Dribble with the ball", () => {
    const m = setup();
    m.press(0, "defend", { x: 1, z: 0 });
    expect(moveOf(m.athletes[0]!)).toBe("crossover");
    expect(m.athletes[0]!.dribbleHand).toBe(1);
    m.press(0, "defend", { x: -1, z: 0 });
    // Still busy: the second press is ignored until the first move and its breather are done.
    expect(m.athletes[0]!.action.kind === "move" && m.athletes[0]!.action.side).toBe(1);
  });

  it("step back away from the basket, square to it, and let the shot come out of it", () => {
    const m = setup();
    const a = m.athletes[0]!;
    const start = rimDistance(a);
    m.press(0, "defend", { x: 0, z: 1 });
    run(m, 0.36);
    expect(rimDistance(a) - start).toBeGreaterThan(0.6);
    expect(rimDistance(a) - start).toBeLessThan(1.5);
    m.press(0, "shoot");
    expect(a.action.kind).toBe("shoot");
  });

  it("cross the ball over to the other hand and carry the body that way", () => {
    const m = setup();
    const a = m.athletes[0]!;
    m.press(0, "defend", { x: -1, z: 0 });
    run(m, 0.4);
    expect(a.dribbleHand).toBe(-1);
    expect(a.x).toBeLessThan(-0.5);
  });

  it("spin all the way round and come out facing the basket", () => {
    const m = setup();
    const a = m.athletes[0]!;
    let turned = 0;
    let last = a.yaw;
    m.press(0, "defend", { x: 0, z: -1 });
    for (let t = 0; t < 0.6; t += STEP) {
      m.step(STEP);
      turned += Math.abs(a.yaw - last);
      last = a.yaw;
    }
    expect(turned).toBeGreaterThan(Math.PI * 1.8);
    expect(Math.cos(a.yaw)).toBeLessThan(-0.9);
  });

  it("shake a defender caught reaching now and then", () => {
    let shakes = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const m = setup(seed, 1.2);
      m.athletes[1]!.whiff = 0.3;
      const events = run(m, 0, []);
      m.press(0, "defend", { x: 1, z: 0 });
      run(m, 0.4, events);
      if (events.some((e) => e.type === "shake")) shakes++;
    }
    expect(shakes).toBeGreaterThan(25);
  });

  it("lose the ball far more often when spammed into a close defender", () => {
    const fumbles = (heat: number, gap: number) => {
      let n = 0;
      for (let seed = 1; seed <= 150; seed++) {
        const m = setup(seed, gap);
        m.athletes[0]!.moveHeat = heat;
        m.press(0, "defend", { x: 1, z: 0 });
        if (run(m, 0.3).some((e) => e.type === "fumble")) n++;
      }
      return n / 150;
    };
    const calm = fumbles(0, 2.1);
    const spam = fumbles(3.5, 0.85);
    expect(calm).toBeLessThan(0.06);
    expect(spam).toBeGreaterThan(0.12);
  });
});
