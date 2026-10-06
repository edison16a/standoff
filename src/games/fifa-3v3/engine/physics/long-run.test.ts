import { describe, expect, it } from "vitest";
import { newBall, stepBall, type Contact } from "../ball";
import { Rng } from "../rng";
import { PITCH, STEP } from "../tuning";
import type { Ball } from "../types";
import { BALL_BODY, NET } from "./constants";
import { gap } from "./capsule";
import { newNets } from "./net";
import { goalFrame } from "./woodwork";

const R = BALL_BODY.radius;
const HL = PITCH.halfLength;
const HW = PITCH.halfWidth;
const GW = PITCH.goalHalfWidth;
const FRAMES = [goalFrame(-1), goalFrame(1)];

/** A wild kick from anywhere on the pitch: fast, high, spinning, often at a goal. */
function wildKick(rng: Rng): Ball {
  const ball = newBall();
  const end = rng.sign();
  ball.pos = { x: rng.range(-HL + 1, HL - 1), y: rng.range(R, 2.5), z: rng.range(-HW + 1, HW - 1) };
  const atGoal = rng.chance(0.6);
  const aim = atGoal ? { x: end * (HL + 1), z: rng.range(-GW - 1, GW + 1) } : { x: rng.range(-HL, HL), z: rng.range(-HW, HW) };
  const dx = aim.x - ball.pos.x;
  const dz = aim.z - ball.pos.z;
  const d = Math.hypot(dx, dz) || 1;
  const speed = rng.range(3, 42);
  ball.vel = { x: (dx / d) * speed, y: rng.range(-3, 12), z: (dz / d) * speed };
  ball.spin = { x: rng.range(-90, 90), y: rng.range(-110, 110), z: rng.range(-90, 90) };
  if (rng.chance(0.2)) ball.wobble = rng.range(0.1, 6);
  return ball;
}

describe("a long run of wild kicks", () => {
  it("never makes a NaN, never leaves the ground, and never passes through a post, the bar, a board or the back of a net", () => {
    const rng = new Rng(77);
    const nets = newNets();
    const faults: string[] = [];
    const check = (ok: boolean, what: string, kick: number) => {
      if (!ok && faults.length < 5) faults.push(`kick ${kick}: ${what}`);
    };
    for (let kick = 0; kick < 300; kick++) {
      const ball = wildKick(rng);
      for (let t = 0; t < 6; t += STEP) {
        stepBall(ball, STEP, [], { nets });
        const { x, y, z } = ball.pos;
        check(Number.isFinite(x + y + z + ball.vel.x + ball.vel.y + ball.vel.z + ball.spin.x + ball.spin.y + ball.spin.z), "not a number", kick);
        check(y >= R - 1e-6, `under the turf at ${y}`, kick);
        check(Math.abs(z) <= HW - R + 1e-6, `through a side board at ${z}`, kick);
        check(Math.abs(x) <= HL + PITCH.catchNet - R + 1e-6, `through a catch net at ${x}`, kick);
        for (const f of FRAMES) for (const rod of [...f.posts, f.bar]) check(gap(rod, ball.pos) > -0.02, `inside the frame at ${x},${y},${z}`, kick);
        // Inside a goal's mouth, never further back than the stretched net.
        if (Math.abs(z) < GW - 0.3 && y < PITCH.goalHeight - 0.3 && Math.abs(x) > HL && Math.abs(x) < HL + PITCH.goalDepth + 0.5) {
          check(Math.abs(x) < HL + PITCH.goalDepth + NET.maxDepth, `through the back of the net at ${x}`, kick);
        }
      }
    }
    expect(faults).toEqual([]);
  }, 60000);

  it("plays the very same flight twice from the same kick", () => {
    const run = () => {
      const rng = new Rng(5);
      const nets = newNets();
      const ball = wildKick(rng);
      const contacts: Contact[] = [];
      for (let t = 0; t < 4; t += STEP) stepBall(ball, STEP, contacts, { nets });
      return { pos: ball.pos, contacts: contacts.length };
    };
    expect(run()).toEqual(run());
  });

  it("comes to rest on a flat pitch and stays there", () => {
    const ball = newBall();
    ball.vel = { x: 6, y: 3, z: 2 };
    ball.spin = { x: 10, y: 30, z: -20 };
    for (let t = 0; t < 20; t += STEP) stepBall(ball, STEP, [], { nets: newNets() });
    expect(Math.hypot(ball.vel.x, ball.vel.y, ball.vel.z)).toBeLessThan(1e-3);
    expect(ball.pos.y).toBeCloseTo(R, 6);
  });
});
