import { describe, expect, it } from "vitest";
import { ballNose, BALL_DRAG, newBall, predict, rpm, solveLaunch, stepSpiral } from "./ball";
import { STEP } from "./tuning";
import { dist3, len3, norm3, v3 } from "./vec";

describe("the spiral", () => {
  it("lands a planned throw on its mark despite drag", () => {
    const from = v3(0, 2, 0);
    const to = v3(30, 1.35, 8);
    const vel = solveLaunch(from, to, 1.6, BALL_DRAG.spiral);
    expect(dist3(predict(from, vel, BALL_DRAG.spiral, 1.6), to)).toBeLessThan(0.05);
  });

  it("flies shorter with drag than without", () => {
    const vel = v3(20, 12, 0);
    const withDrag = predict(v3(), vel, BALL_DRAG.spiral, 2);
    const vacuum = predict(v3(), vel, 0, 2);
    expect(withDrag.x).toBeLessThan(vacuum.x);
  });

  it("turns its nose over to follow the path, and the wobble settles", () => {
    const ball = newBall();
    ball.mode = "spiral";
    ball.pos = v3(0, 2, 0);
    ball.vel = v3(18, 10, 0);
    ball.axis = norm3(ball.vel);
    ball.spinRate = 62;
    ball.wobble = 0.15;
    const startNose = ballNose(ball);
    for (let t = 0; t < 1.8; t += STEP) stepSpiral(ball, STEP);
    expect(startNose.y).toBeGreaterThan(0);
    expect(ball.axis.y).toBeLessThan(0);
    expect(ball.wobble).toBeLessThan(0.15);
    // The nose stays close to the path: a good spiral, not a knuckler.
    const path = norm3(ball.vel);
    expect(Math.acos(ball.axis.x * path.x + ball.axis.y * path.y + ball.axis.z * path.z)).toBeLessThan(0.3);
    expect(ball.roll).toBeGreaterThan(100);
  });

  it("wobbles around the axis, never away from it", () => {
    const ball = newBall();
    ball.axis = v3(1, 0, 0);
    ball.wobble = 0.1;
    for (let p = 0; p < 6; p += 0.5) {
      ball.wobblePhase = p;
      const nose = ballNose(ball);
      expect(len3(nose)).toBeCloseTo(1, 6);
      expect(Math.acos(nose.x)).toBeCloseTo(0.1, 4);
    }
  });

  it("reads its spin in revolutions a minute", () => {
    const ball = newBall();
    ball.spinRate = Math.PI * 20;
    expect(rpm(ball)).toBeCloseTo(600, 6);
  });
});
