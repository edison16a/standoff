import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../builds";
import type { MatchEvent } from "./events";
import { Match, type Entry } from "./match";
import { GREEN_MS, goldHalfMs, gradeRelease, greenHalfMs, makeChance, type ShotContext } from "./shot-model";
import { SHOT, STEP } from "./tuning";

const ENTRIES: Entry[] = BUILD_IDS.slice(0, 6).map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: i === 0 ? 1 : null }));

describe("the gold window", () => {
  it("sits in the middle of the green and grades as gold", () => {
    expect(gradeRelease(GREEN_MS, 5).grade).toBe("gold");
    expect(gradeRelease(GREEN_MS + goldHalfMs(5) - 1, 5).grade).toBe("gold");
    expect(gradeRelease(GREEN_MS - goldHalfMs(5) - 2, 5).grade).toBe("perfect");
    expect(gradeRelease(GREEN_MS + greenHalfMs(5) - 1, 5).grade).toBe("perfect");
  });

  it("is much narrower than the green for every shooter, but never below the floor", () => {
    for (let shooting = 1; shooting <= 10; shooting++) {
      expect(goldHalfMs(shooting)).toBeGreaterThanOrEqual(SHOT.goldMinMs);
      expect(goldHalfMs(shooting)).toBeLessThan(greenHalfMs(shooting) * 0.3);
    }
  });

  it("keeps the green a fair target: wider than two frames each side, tighter than a tenth of a second", () => {
    for (let shooting = 1; shooting <= 10; shooting++) {
      expect(greenHalfMs(shooting)).toBeGreaterThan(33);
      expect(greenHalfMs(shooting)).toBeLessThan(100);
    }
  });

  it("is a sure make even with a hand in the face, where the plain green is not", () => {
    const guarded: ShotContext = { kind: "jumper", grade: "gold", distance: 8, shooting: 4, contest: 1, strengthEdge: 0, onFire: false };
    expect(makeChance(guarded)).toBe(1);
    expect(makeChance({ ...guarded, grade: "perfect" })).toBeLessThan(0.75);
  });
});

describe("a gold jumper in a game", () => {
  it("swishes over a defender right in the shooter's face", () => {
    const m = new Match({ entries: ENTRIES, seed: 9, firstOffence: 0 });
    while (m.phase !== "live") m.step(STEP);
    const a = m.athletes[0]!;
    Object.assign(a, { x: 0, z: 7, vx: 0, vz: 0, action: { kind: "none" } });
    m.ball.holder = 0;
    m.ball.mode = "held";
    m.needsClear = false;
    const d = m.athletes[1]!;
    Object.assign(d, { x: 0, z: 6.3, vx: 0, vz: 0 });
    for (const o of m.athletes) if (o !== a && o !== d) Object.assign(o, { x: o.x + 20 });
    m.press(0, "shoot");
    for (let t = 0; t < GREEN_MS / 1000 - STEP; t += STEP) m.step(STEP);
    m.release(0, GREEN_MS);
    const events: MatchEvent[] = [];
    for (let t = 0; t < 4 && !events.some((e) => e.type === "score"); t += STEP) {
      m.step(STEP);
      events.push(...m.drainEvents());
    }
    const shot = events.find((e) => e.type === "shot");
    expect(shot?.type === "shot" && shot.grade).toBe("gold");
    expect(events.some((e) => e.type === "block")).toBe(false);
    const net = events.find((e) => e.type === "net");
    expect(net?.type === "net" && net.swish).toBe(true);
    expect(events.some((e) => e.type === "score")).toBe(true);
  });
});
