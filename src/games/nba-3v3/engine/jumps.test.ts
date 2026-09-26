import { describe, expect, it } from "vitest";
import { CHARACTER_IDS } from "../roster";
import { createAthlete } from "./athlete";
import { blockStage, startBlock, updateBlock } from "./block";
import { contestFor } from "./contest";
import { chooseDunk } from "./dunk-style";
import { Match, type Entry } from "./match";
import { seeded } from "./rng";
import { JUMP, STEP } from "./tuning";

const ENTRIES: Entry[] = CHARACTER_IDS.slice(0, 6).map((character, i) => ({ team: (i % 2) as 0 | 1, character, seat: null }));

describe("jumping to block", () => {
  it("crouches first, rises in a real arc, and lands with slow legs", () => {
    const m = new Match({ entries: ENTRIES, seed: 1 });
    const a = m.athletes[1]!;
    startBlock(a);
    const act = a.action;
    if (act.kind !== "block") throw new Error("no jump");
    const heights: number[] = [];
    let peakAt = 0;
    for (let t = 0; a.action.kind === "block"; t += STEP) {
      updateBlock(m, a, STEP);
      heights.push(a.y);
      if (a.y > heights[peakAt]!) peakAt = heights.length - 1;
    }
    // Feet down through the gather, the top of the arc halfway through the air.
    const gatherSteps = Math.floor(JUMP.blockGather / STEP);
    expect(heights.slice(0, gatherSteps).every((y) => y === 0)).toBe(true);
    expect(peakAt * STEP).toBeCloseTo(JUMP.blockGather + JUMP.blockAir / 2, 1);
    expect(Math.max(...heights)).toBeGreaterThan(0.4);
    expect(a.recover).toBeCloseTo(JUMP.blockRecover, 5);
    expect(blockStage({ ...act, t: 0.05 }).stage).toBe("gather");
    expect(blockStage({ ...act, t: JUMP.blockGather + 0.1 }).stage).toBe("rise");
  });

  it("blocks more often when timed to the top of the jump", () => {
    const shooter = createAthlete(0, 0, 0, "ashby", null);
    Object.assign(shooter, { x: 0, z: 7 });
    const chanceAt = (t: number) => {
      const d = createAthlete(1, 1, 0, "delacroix", null);
      Object.assign(d, { x: 0, z: 6.2 });
      startBlock(d);
      if (d.action.kind !== "block") throw new Error("no jump");
      d.action.t = t;
      const s = (t - JUMP.blockGather) / JUMP.blockAir;
      d.y = d.action.peak * 4 * s * (1 - s);
      return contestFor(shooter, [d], "jumper").blockChance;
    };
    const top = chanceAt(JUMP.blockGather + JUMP.blockAir / 2);
    const early = chanceAt(JUMP.blockGather + JUMP.blockAir * 0.12);
    const late = chanceAt(JUMP.blockGather + JUMP.blockAir * 0.88);
    expect(top).toBeGreaterThan(early * 1.5);
    expect(top).toBeGreaterThan(late * 1.5);
  });
});

describe("dunks", () => {
  it("come in a few variants, with the star's own the most common", () => {
    const rng = seeded(4);
    const varelas = createAthlete(0, 0, 0, "varelas", null);
    Object.assign(varelas, { x: 0.3, z: 3 });
    const styles = new Map<string, number>();
    for (let i = 0; i < 300; i++) {
      const plan = chooseDunk(rng, varelas, i % 2 === 0);
      styles.set(plan.style, (styles.get(plan.style) ?? 0) + 1);
    }
    expect(styles.size).toBeGreaterThanOrEqual(3);
    const own = styles.get("hammer") ?? 0;
    for (const [style, n] of styles) if (style !== "hammer") expect(own).toBeGreaterThan(n);
  });

  it("go reverse along the baseline, and hang on the rim for the rim hang", () => {
    const rng = seeded(9);
    const mensah = createAthlete(0, 0, 0, "mensah", null);
    Object.assign(mensah, { x: 2.2, z: 1.2 });
    let reverse = 0;
    for (let i = 0; i < 100; i++) if (chooseDunk(rng, mensah, true).style === "reverse") reverse++;
    expect(reverse).toBeGreaterThan(40);
    const vukmir = createAthlete(0, 0, 0, "vukmir", null);
    Object.assign(vukmir, { x: 0, z: 3 });
    for (let i = 0; i < 50; i++) {
      const plan = chooseDunk(rng, vukmir, true);
      if (plan.style === "rimhang") expect(plan.rimHang).toBeGreaterThan(0.4);
    }
  });

  it("hold the dunker up on the rim through the hang, then drop and gather", () => {
    const m = new Match({ entries: ENTRIES, seed: 2, firstOffence: 0 });
    while (m.phase !== "live") m.step(STEP);
    const a = m.athletes[0]!;
    m.athletes.forEach((o, i) => Object.assign(o, { x: -6 + i * 2.4, z: 10.8, auto: false, action: { kind: "none" }, move: { x: 0, z: 0 } }));
    Object.assign(a, { x: 0, z: 3.4, vx: 0, vz: -5 });
    m.ball.holder = 0;
    m.ball.mode = "held";
    m.forced = "swish";
    m.press(0, "shoot");
    const act = a.action;
    if (act.kind !== "drive" || !act.dunk) throw new Error("no dunk");
    act.rimHang = 0.4;
    act.land = act.finish + act.rimHang + 0.3;
    let atSlam = 0;
    let midHang = 0;
    for (let t = 0; a.action.kind === "drive" && t < 3; t += STEP) {
      m.step(STEP);
      if (Math.abs(act.t - act.finish) < STEP / 2 + 1e-9) atSlam = a.y;
      if (Math.abs(act.t - (act.finish + 0.3)) < STEP / 2 + 1e-9) midHang = a.y;
    }
    expect(atSlam).toBeGreaterThan(0.4);
    expect(midHang).toBeGreaterThan(atSlam - 0.1);
    expect(a.recover).toBeGreaterThan(0);
  });
});
