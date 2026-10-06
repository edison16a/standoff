import { describe, expect, it } from "vitest";
import { seeded } from "../rng";
import { BOARD, RIM } from "../tuning";
import { finiteBody, type BallBody } from "./air";
import { BALL } from "./ball-spec";
import { stepBall, type Contact } from "./world";

const body = (pos: [number, number, number], vel: [number, number, number] = [0, 0, 0], w: [number, number, number] = [0, 0, 0]): BallBody => ({
  pos: { x: pos[0], y: pos[1], z: pos[2] },
  vel: { x: vel[0], y: vel[1], z: vel[2] },
  w: { x: w[0], y: w[1], z: w[2] },
});

/** Kinetic, spin and height energy per kilogram. */
const energy = (b: BallBody) =>
  0.5 * (b.vel.x ** 2 + b.vel.y ** 2 + b.vel.z ** 2) +
  0.5 * BALL.inertia * BALL.radius ** 2 * (b.w.x ** 2 + b.w.y ** 2 + b.w.z ** 2) +
  BALL.gravity * b.pos.y;

function run(b: BallBody, seconds: number, out: Contact[] = [], each?: (b: BallBody) => void): Contact[] {
  for (let t = 0; t < seconds; t += 1 / 60) {
    stepBall(b, 1 / 60, out);
    each?.(b);
  }
  return out;
}

describe("a regulation ball on the floor", () => {
  it("comes back to between 1.2 and 1.4 m, measured to its top, when dropped from 1.8 m", () => {
    const b = body([3, 1.8 + BALL.radius, 6]);
    let top = 0;
    let bounced = false;
    for (let t = 0; t < 2.4; t += 1 / 240) {
      const hits: Contact[] = [];
      stepBall(b, 1 / 240, hits);
      if (hits.some((h) => h.kind === "floor")) {
        if (bounced) break;
        bounced = true;
      }
      if (bounced) top = Math.max(top, b.pos.y + BALL.radius);
    }
    expect(top).toBeGreaterThan(1.2);
    expect(top).toBeLessThan(1.4);
  });

  it("bounces lower every time, then rolls to a stop sitting on the floor", () => {
    const b = body([0, 2, 6], [0.8, 0, 0.3]);
    const hits = run(b, 14).filter((c) => c.kind === "floor").map((c) => c.power);
    expect(hits.length).toBeGreaterThan(4);
    for (let i = 1; i < hits.length; i++) expect(hits[i]!).toBeLessThan(hits[i - 1]!);
    expect(b.pos.y).toBeCloseTo(BALL.radius, 4);
    expect(Math.hypot(b.vel.x, b.vel.z)).toBeLessThan(0.6);
  });

  it("picks up topspin off the floor, and backspin checks it up while topspin skips it on", () => {
    const skid = (spin: number) => {
      const b = body([0, 0.5, 6], [3, -2, 0], [0, 0, spin]);
      const hits: Contact[] = [];
      for (let i = 0; i < 400 && !hits.length; i++) stepBall(b, 1 / 480, hits);
      return b;
    };
    // A ball moving to +x rolls about -z; backspin is about +z.
    const plain = skid(0);
    expect(plain.w.z).toBeLessThan(-1);
    expect(skid(25).vel.x).toBeLessThan(plain.vel.x - 0.3);
    expect(skid(-25).vel.x).toBeGreaterThan(plain.vel.x);
  });

  it("rolls without slipping once it settles: the spin matches the speed", () => {
    const b = body([0, BALL.radius, 6], [2.5, 0, 0]);
    run(b, 1);
    expect(b.w.z * BALL.radius).toBeCloseTo(-b.vel.x, 3);
    expect(b.vel.x).toBeGreaterThan(1);
  });
});

describe("the ball in the air", () => {
  it("carries further with backspin, as the Magnus lift holds it up", () => {
    // Flying toward -z, backspin turns about +x: the top of the ball runs back toward the shooter.
    const land = (spin: number) => {
      let t = 0;
      const c = body([0, 2.4, 9], [0, 6.2, -6.3], [spin, 0, 0]);
      while (c.pos.y > 1.2 && t < 4) {
        stepBall(c, 1 / 480, []);
        t += 1 / 480;
      }
      return c.pos.z;
    };
    expect(land(15)).toBeLessThan(land(0) - 0.05);
  });

  it("loses a metre or two of carry to drag on a long heave", () => {
    const fly = (drag: boolean) => {
      // Thrown away from the hoop, so only the air is in the way.
      const c = body([0, 2.4, 3], [0, 7, 7], [0, 0, 0]);
      for (let t = 0; t < 2 && c.pos.y > 1; t += 1 / 480) {
        if (drag) stepBall(c, 1 / 480, []);
        else {
          c.pos.y += c.vel.y / 480 - 0.5 * BALL.gravity / 480 / 480;
          c.vel.y -= BALL.gravity / 480;
          c.pos.z += c.vel.z / 480;
        }
      }
      return c.pos.z;
    };
    const lost = fly(false) - fly(true);
    expect(lost).toBeGreaterThan(0.6);
    expect(lost).toBeLessThan(2.2);
  });
});

describe("the iron and the glass", () => {
  it("bounces off the ring when dropped on it, and counts when dropped through the middle", () => {
    const iron = run(body([RIM.x + RIM.radius, 3.8, RIM.z]), 1.2);
    expect(iron.some((c) => c.kind === "rim")).toBe(true);
    expect(iron.some((c) => c.kind === "through")).toBe(false);
    expect(run(body([RIM.x, 3.8, RIM.z]), 1.2).some((c) => c.kind === "through")).toBe(true);
  });

  it("drops a backspun ball down off the back iron, where topspin kicks it up", () => {
    const off = (spin: number) => {
      const b = body([RIM.x, 3.4, RIM.z + 0.35], [0, -2.5, -4.5], [spin, 0, 0]);
      const hits: Contact[] = [];
      for (let i = 0; i < 480 && !hits.some((c) => c.kind === "rim"); i++) stepBall(b, 1 / 480, hits);
      return b.vel.y;
    };
    expect(off(16)).toBeLessThan(off(0) - 0.3);
    expect(off(-16)).toBeGreaterThan(off(0) + 0.3);
  });

  it("rolls round the ring for a moment when it lands softly on top", () => {
    const touch = BALL.radius + RIM.tube;
    const b = body([RIM.x + RIM.radius - 0.03, RIM.y + Math.sqrt(touch * touch - 0.03 * 0.03), RIM.z], [0, 0, 1.2]);
    let riding = 0;
    let turned = 0;
    for (let i = 0; i < 480 * 2; i++) {
      stepBall(b, 1 / 480, []);
      const hl = Math.hypot(b.pos.x - RIM.x, b.pos.z - RIM.z);
      if (Math.hypot(hl - RIM.radius, b.pos.y - RIM.y) < touch + 0.002) {
        riding += 1 / 480;
        turned = Math.atan2(b.pos.z - RIM.z, b.pos.x - RIM.x);
      }
    }
    expect(riding).toBeGreaterThan(0.2);
    expect(turned).toBeGreaterThan(0.6);
  });

  it("drops a backspun ball steeply off the glass, the way a bank shot kisses in", () => {
    const off = (spin: number) => {
      const b = body([RIM.x + 0.3, 3.5, 2.2], [-0.4, 0.5, -6], [spin, 0, 0]);
      const hits: Contact[] = [];
      for (let i = 0; i < 480 && !hits.some((c) => c.kind === "board"); i++) stepBall(b, 1 / 480, hits);
      return b.vel.y;
    };
    expect(off(15)).toBeLessThan(off(0) - 0.3);
  });

  it("never gains energy from any surface", () => {
    const rng = seeded(4);
    for (let i = 0; i < 120; i++) {
      const b = body([RIM.x + (rng() - 0.5) * 1.6, 3 + rng() * 1.5, RIM.z + 0.2 + rng() * 1.4], [(rng() - 0.5) * 4, (rng() - 0.5) * 6, -rng() * 6], [(rng() - 0.5) * 30, (rng() - 0.5) * 10, (rng() - 0.5) * 30]);
      let before = energy(b);
      for (let k = 0; k < 480 * 3; k++) {
        stepBall(b, 1 / 480, []);
        const now = energy(b);
        expect(now).toBeLessThan(before + 1e-3);
        before = now;
      }
    }
  }, 30000);
});

describe("long runs", () => {
  it("never tunnel through the iron, the glass or the floor, and never go NaN", () => {
    const rng = seeded(17);
    const touch = BALL.radius + RIM.tube;
    for (let i = 0; i < 300; i++) {
      const speed = 3 + rng() * 14;
      const dir = { x: (rng() - 0.5) * 0.6, y: rng() * 0.8 - 0.4, z: -1 };
      const l = Math.hypot(dir.x, dir.y, dir.z);
      const b = body([RIM.x + (rng() - 0.5) * 2, 2.5 + rng() * 1.5, RIM.z + 1 + rng() * 3], [(dir.x / l) * speed, (dir.y / l) * speed, (dir.z / l) * speed], [(rng() - 0.5) * 40, (rng() - 0.5) * 40, (rng() - 0.5) * 40]);
      for (let k = 0; k < 60 * 6; k++) {
        stepBall(b, 1 / 60, []);
        expect(finiteBody(b)).toBe(true);
        const { pos } = b;
        expect(pos.y).toBeGreaterThan(BALL.radius - 1e-3);
        const hl = Math.hypot(pos.x - RIM.x, pos.z - RIM.z);
        expect(Math.hypot(hl - RIM.radius, pos.y - RIM.y)).toBeGreaterThan(touch - 2e-3);
        const inGlass = Math.abs(pos.x - RIM.x) < BOARD.halfWidth && pos.y > BOARD.bottom && pos.y < BOARD.top && pos.z > BOARD.face - BOARD.thickness - BALL.radius + 2e-3 && pos.z < BOARD.face + BALL.radius - 2e-3;
        expect(inGlass).toBe(false);
      }
    }
  }, 30000);

  it("plays the same path every time from the same start", () => {
    const a = body([1, 3, 6], [-1, 4, -6], [10, 2, 3]);
    const b = body([1, 3, 6], [-1, 4, -6], [10, 2, 3]);
    run(a, 4);
    run(b, 4);
    expect(a).toEqual(b);
  });
});
