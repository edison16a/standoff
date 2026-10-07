import { describe, expect, it } from "vitest";
import { BLOCK_PICK, blockKindFor, breaksPair } from "./block-preset";
import { breakPair } from "./line-free";
import { Match } from "./match";
import { BOTS, bySeat, peopleMatch, run, snap } from "./test-helpers";
import { STEP } from "./tuning";
import type { Athlete } from "./types";

const pairOf = (m: Match, slot: number): [Athlete, Athlete] => [
  m.athletes.find((a) => a.role === "lineman" && a.team === m.offense && a.slot === slot)!,
  m.athletes.find((a) => a.role === "lineman" && a.team === m.defense && a.slot === slot)!,
];

describe("block presets", () => {
  it("punch and hand fight off the snap, then set for a pass or fire out for a run", () => {
    expect(blockKindFor("throw", 0.1, 0, 0.5)).toBe("engage");
    expect(blockKindFor("throw", 1, 0, 0.5)).toBe("pass");
    expect(blockKindFor("run", 1, 0, 0.5)).toBe("drive");
  });

  it("anchor against a rusher who is winning and drive one who is losing", () => {
    expect(blockKindFor("throw", 1, BLOCK_PICK.anchor + 0.05, 0.9)).toBe("anchor");
    expect(blockKindFor("throw", 1, BLOCK_PICK.drive - 0.05, 0.9)).toBe("drive");
  });

  it("let a rusher shed late on a big shove, and a blocker pancake his man on a run", () => {
    expect(blockKindFor("throw", BLOCK_PICK.shedAfter + 0.1, BLOCK_PICK.shed + 0.05, 0)).toBe("shed");
    expect(blockKindFor("throw", BLOCK_PICK.shedAfter - 0.3, BLOCK_PICK.shed + 0.05, 0)).toBe("anchor");
    expect(blockKindFor("throw", BLOCK_PICK.shedAfter + 0.1, BLOCK_PICK.shed + 0.05, 0.99)).toBe("anchor");
    expect(blockKindFor("run", 1, BLOCK_PICK.pancake - 0.05, 0)).toBe("pancake");
    // Nobody is pancaked in pass protection, and nobody sheds on a kick.
    expect(blockKindFor("throw", 1, BLOCK_PICK.pancake - 0.05, 0)).toBe("drive");
    expect(blockKindFor("kick", 3, 0.95, 0)).toBe("anchor");
    expect(breaksPair("shed") && breaksPair("pancake") && !breaksPair("anchor")).toBe(true);
  });

  it("carries the pair's move on both linemen, the blocker and the rusher", () => {
    const m = peopleMatch();
    snap(m);
    const [o, d] = pairOf(m, 1);
    expect(o.block).toMatchObject({ kind: "engage", offense: true });
    expect(d.block).toMatchObject({ kind: "engage", offense: false });
    run(m, 1);
    expect(o.block!.kind).not.toBe("engage");
    expect(o.block!.kind).toBe(d.block!.kind);
  });

  it("puts a pancaked rusher on his back and keeps the blocker standing over him", () => {
    const m = peopleMatch();
    snap(m);
    const [o, d] = pairOf(m, 0);
    const p = m.lines[0]!;
    p.move = { kind: "pancake", t: 0 };
    breakPair(m, p, o, d, "pancake");
    run(m, 0.5);
    expect(d.action).toMatchObject({ kind: "down", cause: "pancaked" });
    expect(o.action.kind).toBe("none");
    expect(o.block).toMatchObject({ kind: "pancake", offense: true });
  });

  it("frees a rusher who sheds his man to chase the ball, and he can bring the QB down", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    const [o, d] = pairOf(m, 1);
    const p = m.lines[1]!;
    p.move = { kind: "shed", t: 0 };
    breakPair(m, p, o, d, "shed");
    expect(o.stumble).not.toBeNull();
    const gap0 = Math.hypot(d.x - qb.x, d.z - qb.z);
    const events = run(m, 4, () => m.phase !== "live");
    expect(Math.hypot(d.x - qb.x, d.z - qb.z)).toBeLessThan(gap0);
    // A QB who stands there holding it is brought down by the free rusher.
    expect(events.some((e) => e.type === "whistle")).toBe(true);
  });

  it("sees a rusher shed now and then over whole computer games, and a pancake on a run", () => {
    let snaps = 0;
    let sheds = 0;
    let pancakes = 0;
    for (const seed of [11, 12, 13, 14]) {
      const m = new Match({ entries: BOTS, seed, firstOffense: 0 });
      let was = false;
      const seen = new Set<string>();
      for (let t = 0; t < 900 && m.phase !== "over"; t += STEP) {
        m.step(STEP);
        m.drainEvents();
        const live = m.phase === "live";
        if (live && !was) snaps++;
        was = live;
        m.lines.forEach((p, i) => {
          const key = `${snaps}:${i}`;
          if (!p.loose || seen.has(key)) return;
          seen.add(key);
          if (p.loose === "pancake") pancakes++;
          else sheds++;
        });
      }
    }
    expect(snaps).toBeGreaterThan(40);
    expect(sheds / snaps).toBeGreaterThan(0.1);
    expect(sheds / snaps).toBeLessThan(0.7);
    expect(pancakes).toBeGreaterThan(0);
  }, 60_000);
});
