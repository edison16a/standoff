import { describe, expect, it } from "vitest";
import { yardToX } from "../field";
import { Match } from "../match";
import { BOTS, PEOPLE, run, snap } from "../test-helpers";
import { STEP } from "../tuning";
import { clinchOf } from "./clinch";
import { CLINCH, clinchKindFor } from "./clinch-pick";
import { LAYERS } from "./formation";
import { SUPPORT } from "./roster";

const supports = (m: Match, team: 0 | 1) => m.athletes.filter((a) => a.team === team && a.role === "support");
/** How far past the line of scrimmage a player stands, toward the end zone the offense attacks. */
const past = (m: Match, x: number) => (x - yardToX(m.offense, m.drive.los)) * m.sign;

describe("support players", () => {
  it("fill each side out to eleven", () => {
    const m = new Match({ entries: BOTS, seed: 1 });
    for (const team of [0, 1] as const) {
      expect(m.athletes.filter((a) => a.team === team)).toHaveLength(11);
      expect(supports(m, team)).toHaveLength(SUPPORT.perSide);
    }
  });

  it("line up at the line on offense, and in layers on defence: edges, backers and a deep man", () => {
    const m = new Match({ entries: PEOPLE, seed: 2, firstOffense: 0 });
    for (const a of supports(m, m.offense)) expect(past(m, a.x)).toBeLessThan(0);
    const depth = supports(m, m.defense).map((a) => past(m, a.x) / 0.9144);
    expect(depth.filter((d) => d < 2)).toHaveLength(2);
    expect(depth.filter((d) => Math.abs(d - LAYERS.backer) < 0.5)).toHaveLength(2);
    expect(depth.filter((d) => Math.abs(d - LAYERS.deep) < 0.5)).toHaveLength(1);
  });

  it("picks the block move like the linemen, and never holds a block for ever", () => {
    expect(clinchKindFor(0.1, 0.9, true, 0)).toBe("engage");
    expect(clinchKindFor(1, CLINCH.pancake - 0.1, false, 0)).toBe("pancake");
    expect(clinchKindFor(1, CLINCH.shed + 0.1, true, 0)).toBe("shed");
    expect(clinchKindFor(1, 0.4, true, 0.99)).toBe("anchor");
    expect(clinchKindFor(1, -0.4, true, 0.99)).toBe("drive");
    expect(clinchKindFor(1, 0, true, 0.99)).toBe("pass");
    expect(clinchKindFor(CLINCH.longest, 0, true, 0.99)).toBe("shed");
  });

  it("block the edge rushers on a pass play and never run routes", () => {
    const m = new Match({ entries: PEOPLE, seed: 3, firstOffense: 0, level: "hard" });
    snap(m);
    let blocked = 0;
    let deepest = -Infinity;
    for (let t = 0; t < 2.5 && m.phase === "live"; t += STEP) {
      run(m, STEP);
      for (const o of supports(m, m.offense)) {
        deepest = Math.max(deepest, past(m, o.x));
        if (clinchOf(m, o.id)) blocked++;
      }
    }
    expect(blocked).toBeGreaterThan(0);
    // An outlet leaks a few yards at most; a route would take him far downfield.
    expect(deepest).toBeLessThan(6);
  });

  it("make blocks, sheds and pancakes and tackle runners over whole computer games", () => {
    const seen = { blocks: 0, sheds: 0, pancakes: 0, tackles: 0 };
    for (const seed of [31, 32]) {
      const m = new Match({ entries: BOTS, seed, level: "medium", quarterSeconds: 40 });
      const clinched = new Set<string>();
      const was = new Map<number, string | null>();
      for (let s = 0; s < 60 * 150 && m.phase !== "over"; s++) {
        m.step(STEP);
        for (const e of m.drainEvents()) if (e.type === "tackle" && m.athlete(e.by)?.role === "support") seen.tackles++;
        for (const c of m.support.clinches) {
          const key = `${c.o}:${c.d}:${Math.floor(m.time)}`;
          if (!clinched.has(key) && c.move.t < STEP * 1.5) seen.blocks++;
          clinched.add(key);
        }
        for (const a of m.athletes) {
          const kind = a.role !== "lineman" && a.block?.offense ? a.block.kind : null;
          if (kind !== was.get(a.id) && kind === "shed") seen.sheds++;
          if (kind !== was.get(a.id) && kind === "pancake") seen.pancakes++;
          was.set(a.id, kind);
        }
      }
    }
    expect(seen.blocks).toBeGreaterThan(20);
    expect(seen.sheds).toBeGreaterThan(3);
    expect(seen.pancakes).toBeGreaterThan(0);
    expect(seen.tackles).toBeGreaterThan(3);
  }, 60_000);
});
