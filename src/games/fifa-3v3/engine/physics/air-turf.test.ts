import { describe, expect, it } from "vitest";
import { newBall, stepBall, type Contact } from "../ball";
import { passVelocity, rollingSpin } from "../passing";
import { STEP } from "../tuning";
import type { Ball } from "../types";
import { dragCoefficient, liftCoefficient } from "./aero";
import { BALL_BODY } from "./constants";
import { rollDistance, rollSpeedFor } from "./roll-table";

const R = BALL_BODY.radius;
const fly = (ball: Ball, seconds: number, contacts: Contact[] = []) => {
  for (let t = 0; t < seconds; t += STEP) stepBall(ball, STEP, contacts, { flightOnly: true });
};
/** Motion, height and spin energy per kilogram. */
const energy = (b: Ball) =>
  0.5 * (b.vel.x ** 2 + b.vel.y ** 2 + b.vel.z ** 2) + 9.81 * (b.pos.y - R) + 0.5 * BALL_BODY.inertia * R * R * (b.spin.x ** 2 + b.spin.y ** 2 + b.spin.z ** 2);

describe("the ball itself", () => {
  it("is a 22 cm, 430 g size 5 ball", () => {
    expect(BALL_BODY.radius * 2).toBeCloseTo(0.22, 5);
    expect(BALL_BODY.mass).toBeCloseTo(0.43, 5);
  });
});

describe("the air", () => {
  it("has a drag crisis: high drag when slow, less than half of it past 16 m/s", () => {
    expect(dragCoefficient(5)).toBeGreaterThan(0.44);
    expect(dragCoefficient(20)).toBeLessThan(0.22);
    expect(dragCoefficient(16)).toBeLessThan(dragCoefficient(11) * 0.75);
  });

  it("makes a hard shot dip: it slows through the crisis and the drag doubles", () => {
    const ball = newBall();
    ball.vel = { x: 30, y: 6, z: 0 };
    const pace: number[] = [];
    for (let t = 0; t < 1.4; t += STEP) {
      stepBall(ball, STEP, [], { flightOnly: true });
      pace.push(Math.hypot(ball.vel.x, ball.vel.y));
    }
    // Real shots lose a quarter to a third of their pace over 25 to 30 metres.
    expect(ball.pos.x).toBeGreaterThan(25);
    expect(pace[pace.length - 1]!).toBeLessThan(23);
    expect(pace[pace.length - 1]!).toBeGreaterThan(14);
  });

  it("curls a ball with sidespin and never moves one without", () => {
    const curl = (spinY: number) => {
      const ball = newBall();
      ball.pos.y = 1;
      ball.vel = { x: 25, y: 3, z: 0 };
      ball.spin.y = spinY;
      fly(ball, 0.8);
      return ball.pos.z;
    };
    // Spin crossed with velocity: spin up (+y) on a ball going along +x pushes it to -z.
    expect(curl(60)).toBeLessThan(-0.8);
    expect(curl(-60)).toBeGreaterThan(0.8);
    expect(curl(0)).toBeCloseTo(0, 6);
  });

  it("dips a topspin ball and holds up a backspin one", () => {
    const carry = (spinZ: number) => {
      const ball = newBall();
      ball.vel = { x: 18, y: 9, z: 0 };
      ball.spin.z = spinZ;
      const contacts: Contact[] = [];
      for (let t = 0; t < 4 && contacts.length === 0; t += STEP) stepBall(ball, STEP, contacts, { flightOnly: true });
      return ball.pos.x;
    };
    // Along +x, topspin turns about -z.
    expect(carry(-50)).toBeLessThan(carry(0) - 2);
    expect(carry(50)).toBeGreaterThan(carry(0) + 2);
  });

  it("saturates lift for a fast spinning ball", () => {
    expect(liftCoefficient(0.1)).toBeGreaterThan(0.1);
    expect(liftCoefficient(2)).toBeLessThan(0.46);
  });

  it("loses about a fifth of its spin each second in the air", () => {
    const ball = newBall();
    ball.pos.y = 30;
    ball.spin.y = 60;
    fly(ball, 1);
    expect(ball.spin.y).toBeGreaterThan(45);
    expect(ball.spin.y).toBeLessThan(52);
  });
});

describe("the turf", () => {
  it("sends a ball dropped from 2 m back up 0.6 to 1 m, as FIFA's rebound test asks, and lower each time", () => {
    const ball = newBall();
    ball.pos.y = 2 + R;
    const tops: number[] = [];
    let rising = false;
    let last = ball.pos.y;
    for (let t = 0; t < 6; t += STEP) {
      stepBall(ball, STEP, [], { flightOnly: true });
      if (rising && ball.pos.y < last) tops.push(last - R);
      rising = ball.pos.y > last;
      last = ball.pos.y;
    }
    expect(tops[0]).toBeGreaterThan(0.6);
    expect(tops[0]).toBeLessThan(1);
    for (let i = 1; i < tops.length; i++) expect(tops[i]!).toBeLessThan(tops[i - 1]!);
  });

  it("never gains energy, whatever it lands with", () => {
    for (const spin of [-80, 0, 80]) {
      const ball = newBall();
      ball.pos.y = 1.5;
      ball.vel = { x: 14, y: -3, z: 4 };
      ball.spin = { x: spin * 0.3, y: spin * 0.5, z: spin };
      let before = energy(ball);
      for (let t = 0; t < 4; t += STEP) {
        stepBall(ball, STEP, [], { flightOnly: true });
        const now = energy(ball);
        expect(now).toBeLessThanOrEqual(before + 1e-6);
        before = now;
      }
    }
  });

  it("skids a ball struck flat, then rolls it at about three fifths of its pace with spin to match", () => {
    const ball = newBall();
    ball.vel.x = 10;
    fly(ball, 1.2);
    expect(ball.vel.x).toBeGreaterThan(4.6);
    expect(ball.vel.x).toBeLessThan(6);
    expect(ball.spin.z).toBeCloseTo(-ball.vel.x / R, 3);
  });

  it("rolls a ball rolled true just as the roll table says", () => {
    const ball = newBall();
    ball.vel.x = 9;
    ball.spin = rollingSpin(ball.vel);
    fly(ball, 20);
    expect(ball.pos.x).toBeCloseTo(rollDistance(9), 0);
    expect(rollDistance(10)).toBeGreaterThan(20);
    expect(rollDistance(10)).toBeLessThan(45);
  });

  it("lands a ground pass on its man at the pace it was meant to arrive with", () => {
    for (const d of [6, 14, 25]) {
      const ball = newBall();
      ball.vel = passVelocity(ball.pos, { x: d, z: 0 }, 5.6);
      ball.spin = rollingSpin(ball.vel);
      for (let t = 0; t < 6 && ball.pos.x < d; t += STEP) stepBall(ball, STEP, [], { flightOnly: true });
      expect(Math.abs(ball.vel.x - 5.6)).toBeLessThan(0.15);
      expect(rollSpeedFor(d, 5.6)).toBeGreaterThan(5.6);
    }
  });
});
