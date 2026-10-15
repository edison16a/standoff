import { describe, expect, it } from "vitest";
import type { AthleteView } from "../../engine/view";
import { freshView } from "../test-views";
import { breakMove } from "./break-tackle";
import { neutral } from "./pose";
import { tacklePose } from "./tackle";

function man(over: Partial<AthleteView>): AthleteView {
  const v = freshView();
  return { ...v.athletes.find((a) => a.role === "runner")!, ...over };
}

const run = () => neutral();
const down = (kind: "slam" | "spin" | "blindside", role: "carrier" | "tackler", t: number, dur = 2.1) =>
  tacklePose(man({ action: "down", actionT: t, actionDur: dur, downCause: "tackled", tackle: { kind, role, side: 1, prone: false } }), run)!;

describe("the slam", () => {
  it("lifts the carrier off his feet tipping back, then lays him flat on his back", () => {
    expect(down("slam", "carrier", 0.15).lift).toBeGreaterThan(0.3);
    expect(down("slam", "carrier", 0.15).pitch).toBeLessThan(-0.5);
    expect(down("slam", "carrier", 1.0).pitch).toBeLessThan(-1.4);
  });

  it("flies the hitter through and lands him face down on top before he gets up", () => {
    expect(down("slam", "tackler", 0.2, 1.5).lift).toBeGreaterThan(0.3);
    expect(down("slam", "tackler", 0.6, 1.5).pitch).toBeGreaterThan(1.2);
  });
});

describe("sacks", () => {
  it("swings the QB round in the bear hug and puts him down on his side", () => {
    expect(down("spin", "carrier", 0.5).yaw).toBeGreaterThan(1.2);
    expect(down("spin", "carrier", 1.0).barrel).toBeCloseTo(Math.PI / 2, 1);
  });

  it("whips the QB's head back off a blindside and drives him onto his face", () => {
    expect(down("blindside", "carrier", 0).neckX).toBeLessThan(-0.5);
    expect(down("blindside", "carrier", 1.0).pitch).toBeGreaterThan(1.4);
  });
});

describe("breaking a tackle", () => {
  const breaking = (kind: "truck" | "stiffarm", t: number) => breakMove(man({ action: "none", breaking: { kind, t, dur: 0.6 } }), run)!;

  it("dips the shoulder into a truck and locks the free arm out for a stiff arm, ball still tucked", () => {
    expect(breaking("truck", 0.12).pitch).toBeGreaterThan(0.5);
    const arm = breaking("stiffarm", 0.12);
    expect(arm.shLX).toBeLessThan(-1.5);
    expect(arm.elL).toBeGreaterThan(-0.2);
    expect(arm.elR).toBeLessThan(-1.8);
  });

  it("hands back to the stride when the move is done, and plays nothing without one", () => {
    expect(breaking("stiffarm", 0.6).shLX).toBeCloseTo(neutral().shLX);
    expect(breakMove(man({ action: "none", breaking: null }), run)).toBeNull();
  });
});
