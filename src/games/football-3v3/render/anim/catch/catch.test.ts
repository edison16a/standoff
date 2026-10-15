import { describe, expect, it } from "vitest";
import { CATCH_KINDS, type CatchKind, type CatchResult } from "../../../engine/catch-preset";
import type { AthleteView } from "../../../engine/view";
import { freshView } from "../../test-views";
import { choosePose, type PoseScene } from "../choose";
import { neutral, over, type Pose } from "../pose";
import { catchMove } from "./index";

const RUN = over(neutral(), { hipLX: -0.6, kneeR: 1.1, pitch: 0.2 });
const run = (): Pose => RUN;

/** A receiver `tau` seconds from the ball reaching his hands in move `kind`. */
function catcher(kind: CatchKind, tau: number, more: Partial<NonNullable<AthleteView["catching"]>> = {}, speed = 6): AthleteView {
  const v = freshView();
  const a = v.athletes.find((x) => x.role === "runner")!;
  const result: CatchResult | null = more.result ?? null;
  return { ...a, speed, catching: { kind, t: 0.5 + tau, at: 0.5, side: 1, height: 1.3, result, since: Math.max(0, tau), contest: null, turn: 0, ...more } as NonNullable<AthleteView["catching"]> };
}

const at = (kind: CatchKind, tau: number, more: Partial<NonNullable<AthleteView["catching"]>> = {}, speed = 6) =>
  catchMove(catcher(kind, tau, more, speed), run)!.pose;

describe("catch moves", () => {
  it("start from the stride and have the hands up as the ball arrives", () => {
    for (const k of CATCH_KINDS) {
      expect(at(k, -0.6)).toEqual(RUN);
      const p = at(k, 0);
      expect(Math.min(p.shLX, p.shRX)).toBeLessThan(-0.9);
    }
  });

  it("reach higher for a higher ball, and leave the ground for a high point", () => {
    const chest = at("chest", 0);
    const high = at("high", 0, { height: 2.6 });
    expect(high.shLX).toBeLessThan(chest.shLX - 1);
    expect(high.lift).toBeGreaterThan(0.45);
    expect(chest.lift).toBe(0);
    // Loaded low first, then up.
    expect(at("high", -0.24).kneeL).toBeGreaterThan(1.3);
  });

  it("bend the knees to give with a ball caught near standing, and keep the stride running", () => {
    expect(at("chest", 0, {}, 1).kneeL).toBeGreaterThan(0.8);
    expect(at("chest", 0, {}, 7).kneeR).toBeCloseTo(RUN.kneeR);
  });

  it("lay out flat for a dive and land on the chest", () => {
    expect(at("dive", 0).pitch).toBeGreaterThan(1.2);
    expect(at("dive", 0.4, { result: "held" }).pitch).toBeGreaterThan(1.4);
  });

  it("turn the head back over the shoulder for a ball from behind", () => {
    expect(at("shoulder", 0).neckY).toBeGreaterThan(0.9);
  });

  it("mirror for a ball on the right, but always tuck it away under the right arm", () => {
    expect(at("chest", 0, { side: -1 }).spineY).toBeLessThan(0);
    const left = at("chest", 0.6, { result: "held" });
    const right = at("chest", 0.6, { result: "held", side: -1 });
    expect(right.elR).toBeCloseTo(left.elR);
    expect(right.elR).toBeLessThan(-1.8);
  });

  it("finish each way it can go: open hands for a drop, a jolt for a hit, a swing through for a swat", () => {
    expect(at("chest", 0.1, { result: "dropped" }).shLZ).toBeGreaterThan(0.8);
    expect(at("chest", 0.1, { result: "jarred" }).pitch).toBeLessThan(-0.2);
    const up = at("swat", 0);
    const down = at("swat", 0.1, { result: "swatted" });
    expect(up.shLX).toBeLessThan(-2.8);
    expect(down.shLX).toBeGreaterThan(-1.3);
    expect(at("pick", 0.32, { result: "held" }).lift).toBe(0);
  });

  it("are what the pose chooser plays for a player with a move, over a dive too", () => {
    const v = freshView();
    const s: PoseScene = { phase: "live", phaseT: 1, offense: 0, ball: v.ball, winner: null, center: false, kicker: null, ceremonyT: null };
    const body = { phase: 0.25, build: 0.3, time: 1, seed: 1 };
    const high = choosePose(catcher("high", 0, { height: 2.6 }), s, body);
    expect(high.pose.lift).toBeGreaterThan(0.45);
    expect(high.feet).toBe("free");
    const dive = choosePose({ ...catcher("dive", 0), action: "dive", actionT: 0.2, actionDur: 0.5 }, s, body);
    expect(dive.pose.shLX).toBeLessThan(-2.5);
  });

  it("whips a settled receiver round upfield after the catch, starting from facing the throw", () => {
    const turn = 2.6;
    expect(at("whip", 0, { result: "held", turn }).yaw).toBeCloseTo(turn);
    expect(Math.abs(at("whip", 0.4, { result: "held", turn }).yaw)).toBeLessThan(0.05);
    // Sat into the knees for the ball as it comes.
    expect(at("whip", 0, {}, 0.5).kneeL).toBeGreaterThan(0.8);
  });

  it("throws one hand up and out for a ball past him, then tips onto his hip with it", () => {
    const up = at("onehand", 0);
    expect(up.lift).toBeGreaterThan(0.4);
    expect(up.shLX).toBeLessThan(-2.5);
    expect(up.shRX).toBeGreaterThan(0);
    expect(at("onehand", 0.6, { result: "held" }).pitch).toBeGreaterThan(1.3);
  });

  it("drags both toes and leans out over the sideline, the same way on either side", () => {
    const left = at("toetap", 0, { side: 1 });
    const right = at("toetap", 0, { side: -1 });
    expect(left.ankL).toBeGreaterThan(0.6);
    expect(left.roll).toBeGreaterThan(0.3);
    expect(right.roll).toBeCloseTo(-left.roll);
    // Still leaning out after the ball is in, not only up to the catch.
    expect(at("toetap", 0.15, { side: -1, result: "held" }).roll).toBeLessThan(-0.3);
  });
});
