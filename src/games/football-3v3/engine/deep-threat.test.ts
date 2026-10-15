import { describe, expect, it } from "vitest";
import { pickTarget } from "./aim";
import type { PassInfo } from "./ball";
import { playFor } from "./catch/eligible";
import { FIELD, YARD, yardToX } from "./field";
import { Match } from "./match";
import { candidates, receivers } from "./passing";
import { DEEP_SPLIT } from "./support/formation";
import { defenseJob, jobOf, SUPPORT } from "./support/roster";
import { callPlay, BOTS, PEOPLE, bySeat, run, snap } from "./test-helpers";
import { STEP } from "./tuning";
import type { Athlete, TeamId } from "./types";

const deepOf = (m: Match, team: TeamId) => m.athletes.find((a) => a.team === team && a.deep)!;
/** Yards past the line of scrimmage, toward the end zone the offense attacks. */
const yardsPast = (m: Match, a: Athlete) => ((a.x - yardToX(m.offense, m.drive.los)) * m.sign) / YARD;

/** Steps the live play for `seconds`, and the furthest he got past the line in that time. */
function deepest(m: Match, a: Athlete, seconds: number): number {
  let most = -Infinity;
  for (let t = 0; t < seconds && m.phase === "live"; t += STEP) {
    run(m, STEP);
    most = Math.max(most, yardsPast(m, a));
  }
  return most;
}

/** Calls a play off the page that sends the deep threat straight up the field, hikes with no rusher able to break free, and steps until the QB has it. */
function snapDeep(m: Match): void {
  const qb = m.qbOf(m.offense);
  m.choose(qb.id, "throw");
  for (let deal = 0; deal < 20 && m.huddle; deal++) {
    const at = m.huddle.runners.indexOf(deepOf(m, m.offense).id);
    const pick = m.huddle.plays.findIndex((p) => p.routes[at] === "go" || p.routes[at] === "seam");
    m.playbook(qb.id, pick >= 0 ? pick : "redeal");
  }
  // Nobody breaks free of his block (rush-shed.ts), so the QB stands in long enough for the route to develop.
  for (const d of m.athletes) if (d.team !== m.offense) d.rushCd = 99;
  m.press(qb.id, "hike");
  run(m, 1, () => m.carrier() === qb);
}

describe("the deep threat", () => {
  it("is one support player a side, so it stays eleven a side", () => {
    // A full side of computer players is eleven; with one person runner a side it is ten.
    for (const [entries, size] of [[BOTS, 11], [PEOPLE, 10]] as const) {
      const m = new Match({ entries, seed: 1 });
      for (const team of [0, 1] as const) {
        const side = m.athletes.filter((a) => a.team === team);
        expect(side).toHaveLength(size);
        const deep = side.filter((a) => a.deep);
        expect(deep).toHaveLength(1);
        expect(deep[0]!.role).toBe("support");
        expect(deep[0]!.slot).toBe(SUPPORT.deepSlot);
        expect(jobOf(deep[0]!)).toBe("deep");
        // On defence the same man is the deep man.
        expect(defenseJob(deep[0]!.slot)).toBe("deep");
        expect(side.filter((a) => a.role === "support" && !a.deep)).toHaveLength(SUPPORT.perSide - 1);
      }
    }
  });

  it("can be left out, as in the showcase's game, still eleven a side", () => {
    const m = new Match({ entries: BOTS, seed: 1, deepThreat: false });
    expect(m.athletes.filter((a) => a.deep)).toHaveLength(0);
    for (const team of [0, 1] as const) expect(m.athletes.filter((a) => a.team === team)).toHaveLength(11);
  });

  it("splits out on the line and goes long on a pass call, staying in bounds", () => {
    const m = new Match({ entries: PEOPLE, seed: 2, firstOffense: 0, level: "hard" });
    const dt = deepOf(m, m.offense);
    expect(yardsPast(m, dt)).toBeLessThan(0);
    expect(Math.abs(dt.z - m.drive.ballZ)).toBeCloseTo(DEEP_SPLIT, 0);
    snapDeep(m);
    expect(deepest(m, dt, 3.5)).toBeGreaterThan(15);
    expect(Math.abs(dt.z)).toBeLessThan(FIELD.halfWidth);
  });

  it("blocks instead on a run call", () => {
    const m = new Match({ entries: PEOPLE, seed: 2, firstOffense: 0, level: "hard" });
    const qb = bySeat(m, 0);
    callPlay(m, qb.id, "run");
    m.press(qb.id, "hike");
    run(m, 1, () => m.carrier() === qb);
    expect(deepest(m, deepOf(m, m.offense), 1.5)).toBeLessThan(8);
  });

  it("is a pass target like a runner: in the receivers, the ring and the catch", () => {
    const m = new Match({ entries: PEOPLE, seed: 3, firstOffense: 0, level: "hard" });
    snap(m);
    const qb = bySeat(m, 0);
    const dt = deepOf(m, m.offense);
    run(m, 1.5);
    expect(receivers(m, qb)).toContain(dt);
    expect(candidates(m, qb).find((c) => c.id === dt.id)?.penalty).toBe(0);
    expect(pickTarget(qb, { x: dt.x - qb.x, z: dt.z - qb.z }, candidates(m, qb))).toBe(dt.id);
    // He plays a ball thrown to a runner too, which a blocker never does.
    const pass = { from: qb.id, to: bySeat(m, 1).id, pitch: false } as PassInfo;
    expect(playFor(m, dt, pass)).toBe("catch");
    const blocker = m.athletes.find((a) => a.team === m.offense && a.role === "support" && !a.deep)!;
    expect(playFor(m, blocker, pass)).toBeNull();
  });

  it("catches a long ball thrown to him when he is open", () => {
    const m = new Match({ entries: PEOPLE, seed: 5, firstOffense: 0, level: "hard" });
    snapDeep(m);
    const qb = bySeat(m, 0);
    const dt = deepOf(m, m.offense);
    run(m, 2.2);
    // Everyone who could play the ball well out of the way.
    for (const d of m.athletes) if (d.team !== m.offense && d.role !== "lineman") d.z = -25 * Math.sign(dt.z || 1);
    m.setAim(qb.id, { x: dt.x - qb.x, z: dt.z - qb.z });
    run(m, 0.05);
    m.setAim(qb.id, null);
    run(m, 5, () => m.phase !== "live" || (m.carrier() !== qb && m.carrier() !== null));
    expect(m.play?.caughtBy).toBe(dt.id);
  });

  it("is covered over the top by the deep man when he keys him", () => {
    const m = new Match({ entries: PEOPLE, seed: 6, firstOffense: 0, level: "hard" });
    snapDeep(m);
    const dt = deepOf(m, m.offense);
    const dm = deepOf(m, m.defense);
    dm.bot.key = true;
    let checked = 0;
    for (let t = 0; t < 3.5 && m.phase === "live"; t += STEP) {
      run(m, STEP);
      expect((dm.x - dt.x) * m.sign).toBeGreaterThan(0);
      checked++;
    }
    expect(checked).toBeGreaterThan(60);
    // He has shaded across to the deep threat's side of the field.
    expect(Math.sign(dm.z)).toBe(Math.sign(dt.z));
  });

  it("gets a deep ball now and then from a computer QB, never most of them", () => {
    let throws = 0;
    let deep = 0;
    for (const seed of [21, 22, 23]) {
      const m = new Match({ entries: BOTS, seed, level: "hard", quarterSeconds: 60, target: 999 });
      for (let s = 0; s < 60 * 60 * 8 && m.phase !== "over"; s++) {
        m.step(STEP);
        for (const e of m.drainEvents()) {
          if (e.type !== "throw") continue;
          throws++;
          if (m.athlete(e.to)?.deep) deep++;
        }
      }
    }
    expect(deep).toBeGreaterThan(0);
    expect(deep / throws).toBeLessThan(0.25);
  }, 60_000);
});
