import { describe, expect, it } from "vitest";
import { TACKLE_MOVES } from "../../../engine/tackle-moves";
import { TACKLE_KINDS, type ApproachKind } from "../../../engine/tackle-preset";
import type { AthleteView } from "../../../engine/view";
import { freshView } from "../../test-views";
import { choosePose, plantFor, type PoseScene } from "../choose";
import { JOINTS, neutral, type Pose } from "../pose";
import { mirror } from "./body-keys";
import { tacklePose } from "./index";
import { lungeFor } from "./lunges";
import { stumbleOver } from "./stumble";

const TURN = Math.PI * 2;

function man(over: Partial<AthleteView>): AthleteView {
  const v = freshView();
  return { ...v.athletes.find((a) => a.role === "runner")!, ...over };
}

const scene = (): PoseScene => {
  const v = freshView();
  return { phase: "live", phaseT: 1, offense: 0, ball: v.ball, winner: null, center: false, kicker: null, ceremonyT: null };
};

const finite = (p: Pose) => JOINTS.every((j) => Number.isFinite(p[j]));
const run = () => neutral();
/** Standing again: upright, and any roll come round to a whole turn. */
const upright = (p: Pose) => Math.abs(p.pitch) < 0.05 && Math.abs(Math.sin(p.barrel / 2)) < 0.05 && Math.abs(p.lift) < 0.05;

describe("tackle presets on the body", () => {
  it("plays every preset for every man in it, either side, from the hit to back on his feet", () => {
    for (const kind of TACKLE_KINDS) {
      const move = TACKLE_MOVES[kind];
      type Role = "carrier" | "tackler" | "pile";
      const roles: [Role, number][] = [["carrier", move.carrierDown], ["tackler", move.tacklerDown]];
      if (move.pileDown > 0) roles.push(["pile", move.pileDown]);
      for (const [role, dur] of roles) {
        for (const side of [1, -1] as const) {
          const at = (t: number) => tacklePose(man({ action: "down", actionT: t, actionDur: dur, downCause: "tackled", tackle: { kind, role, side } }), run)!;
          for (let t = 0; t <= dur; t += 0.05) expect(finite(at(t))).toBe(true);
          // Down on the turf in the middle of it, standing at the end.
          expect(Math.abs(at(dur * 0.55).pitch)).toBeGreaterThan(0.9);
          expect(upright(at(dur))).toBe(true);
        }
      }
    }
  });

  it("keeps the ball under the carrier's right arm when he falls the other way", () => {
    const pose = (side: 1 | -1) => tacklePose(man({ action: "down", actionT: 0.3, actionDur: 2, tackle: { kind: "wrap", role: "carrier", side } }), run)!;
    expect(pose(-1).elR).toBeCloseTo(pose(1).elR);
    expect(pose(-1).barrel).toBeCloseTo(-pose(1).barrel);
  });

  it("draws each lunge as its tackle: the drive stays on its feet, the dives leave the ground", () => {
    const mid = (k: ApproachKind) => lungeFor(k, 0.5);
    expect(mid("drive").lift).toBe(0);
    for (const k of ["wrap", "ankle", "shoestring"] as const) expect(mid(k).lift).toBeGreaterThan(0.05);
    // A shoestring lays out flatter than a wrap leaps.
    expect(mid("shoestring").pitch).toBeGreaterThan(mid("wrap").pitch);
  });

  it("plays the misses: a whiff rolls a full turn, a juked man sits down", () => {
    const miss = (cause: AthleteView["downCause"], t: number, dur: number) => tacklePose(man({ action: "down", actionT: t, actionDur: dur, downCause: cause }), run);
    expect(Math.abs(miss("whiff", 0.6, 1.3)!.barrel)).toBeCloseTo(TURN, 1);
    expect(miss("juked", 0.55, 1.3)!.hipLX).toBeLessThan(-0.9);
    expect(miss("shed", 0.8, 1.4)!.pitch).toBeLessThan(-1);
    expect(miss("dive", 0.5, 1)).toBeNull();
  });

  it("is what the figure plays for a man down in a tackle", () => {
    const a = man({ action: "down", actionT: 0.5, actionDur: 2, downCause: "tackled", tackle: { kind: "drive", role: "carrier", side: 1 } });
    const chosen = choosePose(a, scene(), { phase: 0, build: 0.3, time: 1, seed: 1 });
    expect(chosen.pose.pitch).toBeLessThan(-1.2);
    expect(chosen.feet).toBe("free");
  });
});

describe("mirroring", () => {
  it("comes back to the same pose mirrored twice and turns every lean the other way", () => {
    const p = { ...neutral(), roll: 0.3, shLX: -1, kneeR: 0.7, barrel: 1 };
    const m = mirror(p);
    expect(m.roll).toBe(-0.3);
    expect(m.shRX).toBe(-1);
    expect(m.kneeL).toBe(0.7);
    expect(mirror(m)).toEqual(p);
  });
});

describe("weight on the feet", () => {
  it("plants the outside foot when braking into a cut", () => {
    const a = man({ speed: 7 });
    expect(plantFor(a, { phase: 0, build: 0, time: 0, seed: 0, push: -6, turn: 4 })).toBe("plantR");
    expect(plantFor(a, { phase: 0, build: 0, time: 0, seed: 0, push: -6, turn: -4 })).toBe("plantL");
    expect(plantFor(a, { phase: 0, build: 0, time: 0, seed: 0, push: 2, turn: 4 })).toBe("gait");
  });

  it("lurches a fooled man toward the side he bit on, then lets him go", () => {
    const p = neutral();
    expect(stumbleOver(p, 0.35, 0.75, 1).roll).toBeGreaterThan(0.2);
    expect(stumbleOver(p, 0.35, 0.75, -1).roll).toBeLessThan(-0.2);
    expect(stumbleOver(p, 0.75, 0.75, 1).roll).toBeCloseTo(0, 5);
  });
});
