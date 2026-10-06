import { describe, expect, it } from "vitest";
import type { AthleteView } from "../../engine/view";
import { freshView } from "../test-views";
import { aheadSpeed, choosePose, reachFor, type PoseScene } from "./choose";
import { spikePose, SPIKE_RELEASE } from "./celebrations";
import { downPose } from "./contact";
import { gait } from "./gait";
import { approach, JOINTS, keyed, mix, neutral, over } from "./pose";
import { CENTER, THREE_POINT } from "./stance";
import { kickPose, throwPose } from "./throwing";
import { TACKLE } from "../../engine/tuning";

const body = { phase: 0.25, build: 0.3, time: 1, seed: 1 };

function scene(v = freshView()): PoseScene {
  return { phase: "live", phaseT: 1, offense: 0, ball: v.ball, winner: null, center: false, kicker: null, ceremonyT: null };
}

function player(over: Partial<AthleteView> = {}): AthleteView {
  const v = freshView();
  return { ...v.athletes.find((a) => a.role === "runner")!, ...over };
}

describe("poses", () => {
  it("blends every joint and turns the short way round", () => {
    const a = neutral();
    const b = over(neutral(), { yaw: Math.PI * 1.9, kneeL: 2 });
    const m = mix(a, b, 0.5);
    expect(m.kneeL).toBeCloseTo(1);
    expect(m.yaw).toBeCloseTo(-Math.PI * 0.05);
    const c = neutral();
    approach(c, b, 1000, 1);
    for (const j of JOINTS) if (j !== "yaw") expect(c[j]).toBeCloseTo(b[j]);
  });

  it("holds the first and last keys outside the keyed range", () => {
    const a = over(neutral(), { kneeL: 1 });
    const b = over(neutral(), { kneeL: 2 });
    expect(keyed([[0.2, a], [0.4, b]], 0).kneeL).toBe(1);
    expect(keyed([[0.2, a], [0.4, b]], 1).kneeL).toBe(2);
    expect(keyed([[0.2, a], [0.4, b]], 0.3).kneeL).toBeCloseTo(1.5);
  });

  it("swings the legs against each other on the run and pumps the arms against the legs", () => {
    // Over a whole stride the two thighs move opposite ways, and each arm against its own leg.
    const corr = (f: (p: ReturnType<typeof gait>) => [number, number]) => {
      let sum = 0;
      for (let i = 0; i < 40; i++) {
        const [a, b] = f(gait({ speed: 8, ahead: 8, phase: i / 40, carry: "none", build: 0, time: 0, seed: 0 }));
        sum += a * b;
      }
      return sum;
    };
    const mean = (k: "hipLX" | "hipRX" | "shLX") => {
      let m = 0;
      for (let i = 0; i < 40; i++) m += gait({ speed: 8, ahead: 8, phase: i / 40, carry: "none", build: 0, time: 0, seed: 0 })[k] / 40;
      return m;
    };
    const [hl, hr, sl] = [mean("hipLX"), mean("hipRX"), mean("shLX")];
    expect(corr((p) => [p.hipLX - hl, p.hipRX - hr])).toBeLessThan(0);
    expect(corr((p) => [p.shLX - sl, p.hipLX - hl])).toBeLessThan(0);
    const still = gait({ speed: 0, ahead: 0, phase: 0.25, carry: "none", build: 0, time: 0, seed: 0 });
    expect(Math.abs(still.hipLX)).toBeLessThan(0.01);
  });

  it("tucks the ball high and tight on the run", () => {
    const p = gait({ speed: 8, ahead: 8, phase: 0.1, carry: "tuck", build: 0, time: 0, seed: 0 });
    expect(p.elR).toBeLessThan(-1.7);
    const q = gait({ speed: 8, ahead: 8, phase: 0.6, carry: "tuck", build: 0, time: 0, seed: 0 });
    expect(q.shRX).toBeCloseTo(p.shRX);
  });

  it("lets the throwing arm come forward through the release", () => {
    const loaded = throwPose(0.12, 0.45);
    const released = throwPose(0.22, 0.45);
    expect(loaded.shRZ).toBeGreaterThan(1);
    expect(released.shRX).toBeLessThan(loaded.shRX);
  });

  it("swings the kicking leg from behind to high in front", () => {
    expect(kickPose(0.2).hipRX).toBeGreaterThan(0.5);
    expect(kickPose(0.6).hipRX).toBeLessThan(-1.5);
  });

  it("lies flat while down and stands again at the end", () => {
    expect(downPose(1, 2.4, "dive", 1).pitch).toBeGreaterThan(1.3);
    expect(downPose(1, 2.4, "tackled", 2).pitch).toBeLessThan(-1.3);
    const up = downPose(2.4, 2.4, "dive", 1);
    expect(Math.abs(up.pitch)).toBeLessThan(0.05);
    expect(downPose(2.4 - TACKLE.getUp * 0.55, 2.4, "dive", 1).kneeR).toBeGreaterThan(1.5);
  });

  it("raises the ball for the spike and slams it down at the release", () => {
    expect(spikePose(0.4).shRX).toBeLessThan(-2.5);
    expect(spikePose(SPIKE_RELEASE).shRX).toBeGreaterThan(-0.5);
  });
});

describe("picking a pose from the view", () => {
  it("puts the center in his stance and the other linemen in a three point stance", () => {
    const v = freshView();
    const lineman = v.athletes.find((a) => a.role === "lineman" && a.team === 0)!;
    const s = { ...scene(v), phase: "presnap" as const };
    const a = { ...lineman, action: "stance" as const };
    expect(choosePose(a, { ...s, center: true }, body).pose.shLX).toBeCloseTo(CENTER.shLX, 1);
    expect(choosePose(a, s, body).pose.shRX).toBeCloseTo(THREE_POINT.shRX, 1);
  });

  it("holds the ball in both hands for a QB in the pocket and tucks it on the run", () => {
    const v = freshView();
    const qb = { ...v.athletes.find((a) => a.role === "qb" && a.team === 0)!, hasBall: true, action: "none" as const };
    const s = { ...scene(v), ball: { ...v.ball, state: "held" as const, holder: qb.id } };
    expect(choosePose({ ...qb, speed: 1 }, s, body).hand).toBe("both");
    expect(choosePose({ ...qb, speed: 8, vx: 8, vz: 0, yaw: Math.PI / 2 }, s, body).hand).toBe("R");
  });

  it("reads backpedalling from the velocity against the facing", () => {
    expect(aheadSpeed(player({ yaw: Math.PI / 2, vx: -3, vz: 0 }))).toBeCloseTo(-3);
  });

  it("reaches for a pass coming in, and not for one going away", () => {
    const v = freshView();
    const a = player({ x: 10, z: 0, targeted: true });
    const coming = { ...v.ball, state: "pass" as const, x: 6, y: 1.8, z: 0, vx: 15, vy: 0, vz: 0 };
    expect(reachFor(a, coming).reach).toBeGreaterThan(0.3);
    expect(reachFor(a, { ...coming, vx: -15 }).reach).toBe(0);
    expect(reachFor({ ...a, targeted: false, x: 30 }, coming).reach).toBe(0);
  });

  it("leaves a pass over the line to the defence, not the passer's own linemen", () => {
    const v = freshView();
    const overhead = { ...v.ball, state: "pass" as const, x: 9, y: 2.2, z: 0, vx: 15, vy: 0, vz: 0 };
    const s = { ...scene(v), ball: overhead };
    const line = { ...v.athletes.find((a) => a.role === "lineman" && a.team === 0)!, x: 10, z: 0, action: "none" as const, blocked: false };
    const own = choosePose(line, s, body).pose;
    const theirs = choosePose({ ...line, team: 1 }, s, body).pose;
    // A reach raises the arms: the shoulders swing well forward and up.
    expect(own.shRX).toBeGreaterThan(-1);
    expect(theirs.shRX).toBeLessThan(own.shRX - 0.5);
  });

  it("plays every action without producing a broken number", () => {
    const v = freshView();
    const kinds = ["stance", "juke", "dive", "lunge", "throw", "kick", "down", "celebrate", "none"] as const;
    for (const action of kinds) {
      for (const t of [0, 0.1, 0.3, 0.6, 1.5, 3]) {
        const a = player({ action, actionT: t, actionDur: 2, juke: "spin", downCause: "tackled", speed: 5, vx: 5 });
        const { pose } = choosePose(a, scene(v), body);
        for (const j of JOINTS) expect(Number.isFinite(pose[j])).toBe(true);
      }
    }
  });
});
