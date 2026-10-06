import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../builds";
import { buildOf } from "./athlete";
import type { MatchEvent } from "./events";
import { Match, type Entry } from "./match";
import { BALL } from "./physics/ball-spec";
import { bounceDrop, bounceTime } from "./physics/bounce-solve";
import { STEP } from "./tuning";

const ENTRIES: Entry[] = BUILD_IDS.slice(0, 6).map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: i === 0 ? 1 : null }));

/** Player 0 with the ball at the top facing the rim, everyone else far off and still. */
function setup(): Match {
  const m = new Match({ entries: ENTRIES, seed: 6, firstOffence: 0 });
  while (m.phase !== "live") m.step(STEP);
  m.athletes.forEach((a, i) => Object.assign(a, { x: -6 + i * 2.4, z: 10.8, vx: 0, vz: 0, y: 0, auto: false, move: { x: 0, z: 0 }, action: { kind: "none" } }));
  Object.assign(m.athletes[0]!, { x: 0, z: 8, yaw: Math.PI, dribbleHand: 1, dribbleSide: 1, pocket: 0 });
  m.ball.holder = 0;
  m.ball.mode = "held";
  m.ball.hand = "held";
  m.ball.pos = { x: 0, y: 1.2, z: 7.7 };
  m.shotClock = 99;
  m.drainEvents();
  return m;
}

function run(m: Match, seconds: number, each?: () => void): MatchEvent[] {
  const events: MatchEvent[] = [];
  for (let t = 0; t < seconds; t += STEP) {
    m.step(STEP);
    each?.();
    events.push(...m.drainEvents());
  }
  return events;
}

describe("the bounce solver", () => {
  it("finds the push that brings a bounce back to the hand on time", () => {
    for (const [y0, y1, time] of [[0.75, 0.75, 0.32], [0.8, 0.7, 0.45], [1.1, 1.2, 0.6]] as const) {
      expect(bounceTime(bounceDrop(y0, y1, time), y0, y1)).toBeCloseTo(time, 3);
    }
  });
});

describe("a dribble on the ball physics", () => {
  it("pounds standing still: the hand pushes it down hard and it comes back up to the hand, bounce after bounce", () => {
    const m = setup();
    const a = m.athletes[0]!;
    const hands = new Set<string>();
    let freeFall = 0;
    let lastVy: number | null = null;
    const events = run(m, 3, () => {
      hands.add(m.ball.hand);
      // Between the hand and the floor only gravity and the air act on it.
      if (m.ball.hand === "free" && lastVy !== null && m.ball.pos.y > BALL.radius + 0.05 && m.ball.vel.y < lastVy) freeFall = Math.max(freeFall, (lastVy - m.ball.vel.y) / STEP);
      lastVy = m.ball.hand === "free" ? m.ball.vel.y : null;
    });
    const bounces = events.filter((e) => e.type === "bounce");
    expect(bounces.length).toBeGreaterThan(5);
    expect(bounces.length).toBeLessThan(9);
    expect(events.some((e) => e.type === "fumble")).toBe(false);
    expect(hands.has("dribble") && hands.has("free")).toBe(true);
    expect(freeFall).toBeGreaterThan(9);
    expect(freeFall).toBeLessThan(11.5);
    expect(m.ball.holder).toBe(a.id);
  });

  it("keeps the ball at the side on the run and never loses it", () => {
    const m = setup();
    const a = m.athletes[0]!;
    m.setMove(0, { x: 1, z: 0 });
    let far = 0;
    const events = run(m, 2.5, () => {
      if (m.ball.hand === "free") far = Math.max(far, Math.hypot(m.ball.pos.x - a.x, m.ball.pos.z - a.z));
    });
    expect(events.some((e) => e.type === "fumble")).toBe(false);
    expect(events.filter((e) => e.type === "bounce").length).toBeGreaterThan(2);
    expect(far).toBeLessThan(0.9);
  });

  it("stays low and tight on a drive at the rim", () => {
    const top = (move: { x: number; z: number }, from: { x: number; z: number }) => {
      const m = setup();
      const a = m.athletes[0]!;
      Object.assign(a, from);
      m.setMove(0, move);
      let high = 0;
      run(m, 1.6, () => {
        if (Math.hypot(a.vx, a.vz) > 3 && m.ball.hand === "free") high = Math.max(high, m.ball.pos.y);
      });
      return high / buildOf(a).body.height;
    };
    expect(top({ x: 0, z: -1 }, { x: 0, z: 9.5 })).toBeLessThan(top({ x: 1, z: 0 }, { x: -6, z: 9.5 }) - 0.03);
  });

  it("takes the ball across in front on a crossover", () => {
    const m = setup();
    const a = m.athletes[0]!;
    run(m, 0.5);
    m.press(0, "defend", { x: -1, z: 0 });
    let left = false;
    run(m, 0.9, () => {
      // Facing -z, the player's left is -x.
      if (m.ball.hand !== "free" && m.ball.pos.x < a.x - 0.15) left = true;
    });
    expect(a.dribbleHand).toBe(-1);
    expect(left).toBe(true);
  });
});
