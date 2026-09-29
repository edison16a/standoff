import { describe, expect, it } from "vitest";
import { newBall, stepBall } from "./ball";
import { CHARGE } from "./charge";
import { solveKick } from "./shot-aim";
import { autoAimZ, autoCurl, shotHeight } from "./shot-plan";
import { BALL, PITCH, STEP } from "./tuning";

const HL = PITCH.halfLength;
const GW = PITCH.goalHalfWidth;

describe("a shot left to the game", () => {
  it("goes across to the far post from one side", () => {
    // Shooting at the +x goal from the +z side, keeper in the middle.
    expect(autoAimZ({ x: HL - 10, z: 6 }, { x: HL - 1, z: 0 })).toBeLessThan(-GW / 2);
    expect(autoAimZ({ x: HL - 10, z: -6 }, { x: HL - 1, z: 0 })).toBeGreaterThan(GW / 2);
  });

  it("goes near post when the keeper has already covered the far one", () => {
    expect(autoAimZ({ x: HL - 10, z: 6 }, { x: HL - 1, z: -1.2 })).toBeGreaterThan(GW / 2);
  });

  it("goes away from the keeper straight on", () => {
    expect(autoAimZ({ x: HL - 10, z: 0.3 }, { x: HL - 1, z: 0.8 })).toBeLessThan(0);
    expect(autoAimZ({ x: HL - 10, z: 0.3 }, { x: HL - 1, z: -0.8 })).toBeGreaterThan(0);
  });

  it("stays inside the posts", () => {
    for (const z of [-8, -3, 0, 3, 8]) expect(Math.abs(autoAimZ({ x: HL - 12, z }, { x: HL - 1, z: 0 }))).toBeLessThan(GW);
  });
});

describe("the curl", () => {
  it("bends a far post shot from a wide angle back toward the shooter's side", () => {
    const from = { x: HL - 9, y: BALL.radius, z: 7 };
    const aim = autoAimZ(from, { x: HL - 1, z: 0.5 });
    const spin = autoCurl(from, aim, 1, 0.9);
    expect(Math.abs(spin)).toBeGreaterThan(5);
    // Flown with that spin, the ball starts outside the line to the target and bends back in.
    const target = { x: HL, y: 1, z: aim };
    const kick = solveKick(from, target, 24, spin);
    const ball = newBall();
    ball.pos = { ...from };
    ball.vel = { ...kick.vel };
    ball.spin = { ...kick.spin };
    let widest = 0;
    for (let t = 0; t < kick.time; t += STEP) {
      stepBall(ball, STEP, [], { flightOnly: true });
      const along = (ball.pos.x - from.x) / (target.x - from.x);
      const straight = from.z + (target.z - from.z) * along;
      widest = Math.min(widest, ball.pos.z - straight);
    }
    expect(widest).toBeLessThan(-0.15);
  });

  it("barely bends a shot from straight on", () => {
    expect(Math.abs(autoCurl({ x: HL - 12, z: 0.5 }, 2, 1, 0.9))).toBeLessThan(1);
  });
});

describe("the height", () => {
  it("keeps every shot below the red zone under the bar", () => {
    for (let power = 0; power < CHARGE.red; power += 0.05) {
      for (const roll of [0, 0.5, 0.999]) expect(shotHeight(power, roll)).toBeLessThan(PITCH.goalHeight - BALL.radius);
    }
  });

  it("rises with the bar: green low, red high", () => {
    expect(shotHeight(0.2, 0.5)).toBeLessThan(shotHeight(0.6, 0.5));
    expect(shotHeight(0.6, 0.5)).toBeLessThan(shotHeight(0.95, 0.5));
  });
});
