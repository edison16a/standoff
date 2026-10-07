import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../builds";
import { blendStyles, DRIBBLE_STYLES, styleWeights } from "./dribble-style";
import { Match, type Entry } from "./match";
import { pickMove } from "./move-pick";
import { STEP } from "./tuning";

const ENTRIES: Entry[] = BUILD_IDS.slice(0, 6).map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: i === 0 ? 1 : null }));

const top = (w: Record<string, number>) => Object.entries(w).sort((a, b) => b[1] - a[1])[0]![0];

describe("the dribble presets", () => {
  it("are weighed by speed, the way of travel and the man on the ball", () => {
    expect(top(styleWeights(0, 0, false, 9))).toBe("pound");
    expect(top(styleWeights(2.2, 2.2, false, 9))).toBe("jog");
    expect(top(styleWeights(5.5, 5.5, false, 9))).toBe("sprint");
    expect(top(styleWeights(5.5, 5.5, true, 9))).toBe("drive");
    expect(top(styleWeights(2.5, -2.5, false, 9))).toBe("retreat");
    expect(top(styleWeights(0.5, 0.5, false, 0.8))).toBe("protect");
  });

  it("always add up to one whole dribble", () => {
    for (const [speed, along, rim, near] of [[0, 0, false, 9], [3.4, 1, true, 1.3], [6, -2, false, 0.5]] as const) {
      const w = styleWeights(speed, along, rim, near);
      expect(Object.values(w).reduce((s, k) => s + k, 0)).toBeCloseTo(1, 6);
    }
  });

  it("blend smoothly: halfway between the jog and the sprint sits between them", () => {
    const mid = blendStyles({ pound: 0, jog: 0.5, sprint: 0.5, drive: 0, retreat: 0, protect: 0 });
    expect(mid.palm).toBeCloseTo((DRIBBLE_STYLES.jog.palm + DRIBBLE_STYLES.sprint.palm) / 2, 6);
    expect(mid.palm).toBeLessThan(DRIBBLE_STYLES.jog.palm);
    expect(mid.palm).toBeGreaterThan(DRIBBLE_STYLES.sprint.palm);
  });

  it("settle the live dribble low as soon as the handler sprints", () => {
    const m = new Match({ entries: ENTRIES, seed: 4, firstOffence: 0 });
    while (m.phase !== "live") m.step(STEP);
    m.athletes.forEach((a, i) => Object.assign(a, { x: -6 + i * 2.4, z: 10.8, vx: 0, vz: 0, auto: false, move: { x: 0, z: 0 } }));
    const a = m.athletes[0]!;
    Object.assign(a, { x: -6, z: 9, yaw: Math.PI / 2 });
    m.ball.holder = 0;
    m.setMove(0, { x: 1, z: 0 });
    for (let t = 0; t < 1.6; t += STEP) m.step(STEP);
    expect(a.dribbleStyle.palm).toBeLessThan(DRIBBLE_STYLES.jog.palm - 0.06);
    expect(a.dribbleStyle.low).toBeGreaterThan(0.6);
  });
});

describe("between the legs", () => {
  it("is the stick pulled back at an angle, to that side, rocking back off the man", () => {
    const m = new Match({ entries: ENTRIES, seed: 1, firstOffence: 0 });
    const a = m.athletes[0]!;
    Object.assign(a, { x: 0, z: 8, yaw: Math.PI });
    // The rim is toward -z, so back is +z and the handler's right is +x.
    const pick = pickMove(a, { x: 0.8, z: 0.6 }, null);
    expect(pick).toMatchObject({ move: "betweenLegs", side: 1 });
    expect(pick.dir.z).toBeGreaterThan(0);
    expect(pickMove(a, { x: 0, z: 1 }, null).move).toBe("stepback");
    expect(pickMove(a, { x: 1, z: 0 }, null).move).toBe("crossover");
  });

  it("changes hands and keeps the ball, the hand meeting it on the other side", () => {
    const m = new Match({ entries: ENTRIES, seed: 2, firstOffence: 0 });
    while (m.phase !== "live") m.step(STEP);
    m.athletes.forEach((a, i) => Object.assign(a, { x: -6 + i * 2.4, z: 10.8, vx: 0, vz: 0, auto: false, move: { x: 0, z: 0 } }));
    const a = m.athletes[0]!;
    Object.assign(a, { x: 0, z: 8, yaw: Math.PI, dribbleHand: 1, dribbleSide: 1 });
    m.ball.holder = 0;
    for (let t = 0; t < 0.5; t += STEP) m.step(STEP);
    m.press(0, "defend", { x: -0.8, z: 0.6 });
    expect(a.action.kind === "move" && a.action.move).toBe("betweenLegs");
    const events = [];
    for (let t = 0; t < 0.8; t += STEP) {
      m.step(STEP);
      events.push(...m.drainEvents());
    }
    expect(a.dribbleHand).toBe(-1);
    expect(m.ball.holder).toBe(0);
    expect(events.some((e) => e.type === "fumble")).toBe(false);
  });
});
