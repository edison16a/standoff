import { describe, expect, it } from "vitest";
import { BUILD_IDS, type BuildId } from "../../builds";
import { DUNK_STYLES } from "../../roster";
import { createAthlete } from "../athlete";
import { Match, type Entry } from "../match";
import { seeded } from "../rng";
import { solvePreset } from "../shot-outcome/solve";
import { RIM, STEP } from "../tuning";
import { LAYUPS, type LayupKind } from "../types";
import { dist3, type V3 } from "../vec";
import type { Forced } from "./select";
import { layupInput } from "./layup-release";
import { planFinish } from "./plan";
import { ARM_USE, armLength, shoulderAt } from "./reach";

const ENTRIES: Entry[] = BUILD_IDS.slice(0, 6).map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: null }));

/** A live match with player 0 (of `build`) running at the rim from the front with the ball, everyone else far off and still. */
function drive(build: BuildId, forced: Forced): Match {
  const m = new Match({ entries: ENTRIES.map((e, i) => (i === 0 ? { ...e, build } : e)), seed: 5, firstOffence: 0 });
  while (m.phase !== "live") m.step(STEP);
  m.athletes.forEach((a, i) => Object.assign(a, { x: i === 0 ? 0.6 : -6 + i * 0.4, z: i === 0 ? 4.2 : 11, vx: 0, vz: i === 0 ? -4.5 : 0, auto: false, move: { x: 0, z: 0 }, action: { kind: "none" } }));
  m.ball.holder = 0;
  m.ball.mode = "held";
  // Up off the last bounce at the hip, as a drive picks it up.
  m.ball.pos = { x: 0.85, y: 0.9, z: 4.0 };
  m.forced = "swish";
  m.forcedFinish = forced;
  m.press(0, "shoot");
  return m;
}

const shoulder: V3 = { x: 0, y: 0, z: 0 };
const ALL: Forced[] = [...LAYUPS.map((layup) => ({ layup })), ...DUNK_STYLES.map((dunk) => ({ dunk }))];

describe("the finishing presets", () => {
  it("keep the ball in a hand from the gather to the release, moving smoothly with the body, for every build", () => {
    for (const build of BUILD_IDS) {
      for (const forced of ALL) {
        const m = drive(build, forced);
        const a = m.athletes[0]!;
        expect(a.action.kind, JSON.stringify(forced)).toBe("drive");
        let last: V3 | null = null;
        while (a.action.kind === "drive" && !a.action.released) {
          m.step(STEP);
          if (m.ball.holder !== 0) break;
          const reach = armLength(a) * ARM_USE + 1e-6;
          // Either hand will do: the ball is always within one arm's reach of a shoulder.
          const near = Math.min(dist3(m.ball.pos, shoulderAt(a, a, a.yaw, 1, shoulder)), dist3(m.ball.pos, shoulderAt(a, a, a.yaw, -1, shoulder)));
          expect(near, `${build} ${JSON.stringify(forced)}`).toBeLessThanOrEqual(reach);
          // The hands move it no faster than a real arm swing, against the body.
          const rel = { x: m.ball.pos.x - a.x, y: m.ball.pos.y - a.y, z: m.ball.pos.z - a.z };
          if (last) expect(dist3(rel, last) / STEP, `${build} ${JSON.stringify(forced)}`).toBeLessThan(13);
          last = rel;
        }
      }
    }
  });

  it("take the ball over the ring in the hand on every dunk, down through the net, then hang or drop", () => {
    for (const build of BUILD_IDS) {
      for (const dunk of DUNK_STYLES) {
        const m = drive(build, { dunk });
        const a = m.athletes[0]!;
        const act = a.action;
        if (act.kind !== "drive") throw new Error("no drive");
        let slam: V3 | null = null;
        let net = false;
        for (let t = 0; t < 3 && !net; t += STEP) {
          m.step(STEP);
          if (!slam && act.released) slam = { ...m.ball.pos };
          net ||= m.events.some((e) => e.type === "net");
        }
        expect(slam, `${build} ${dunk}`).not.toBeNull();
        expect(slam!.y).toBeGreaterThan(RIM.y + 0.05);
        expect(Math.hypot(slam!.x - RIM.x, slam!.z - RIM.z)).toBeLessThan(RIM.radius);
        expect(net, `${build} ${dunk}`).toBe(true);
        if (act.rimHang > 0) expect(act.hangY).toBeLessThan(act.peak);
      }
    }
  });

  it("let every layup go clear of the ring, from where the ball can still drop", () => {
    const rng = seeded(8);
    for (const kind of LAYUPS) {
      let made = 0;
      let n = 0;
      for (const build of BUILD_IDS) {
        for (const ang of [-0.9, 0, 0.9]) {
          const a = createAthlete(0, 0, 0, build, null);
          Object.assign(a, { x: Math.sin(ang) * 2.6, z: RIM.z + Math.cos(ang) * 2.6, vx: -Math.sin(ang) * 4, vz: -Math.cos(ang) * 4 });
          if (kind === "reverse") Object.assign(a, { x: 2.4, z: 1.45, vx: -4, vz: 0 });
          const hand = ang < 0 ? -1 : 1;
          const act = planFinish(rng, a, { dunk: false, layup: kind as LayupKind, style: null, hand, side: hand }, { x: a.x, y: 1, z: a.z });
          const out = Math.hypot(act.release.x - RIM.x, act.release.z - RIM.z);
          expect(out, `${kind} ${build}`).toBeGreaterThan(RIM.radius + 0.25);
          const input = layupInput(rng, kind, act.release, out);
          n++;
          if (solvePreset(rng, input, input.family === "bank" ? "bank" : "swish").detail.made) made++;
        }
      }
      expect(made / n, kind).toBeGreaterThan(0.75);
    }
  });
});
