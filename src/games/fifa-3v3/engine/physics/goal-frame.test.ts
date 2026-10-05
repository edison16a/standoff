import { describe, expect, it } from "vitest";
import { newBall, stepBall, type Contact } from "../ball";
import { scoredIn } from "../goal";
import { PITCH, STEP } from "../tuning";
import type { Ball } from "../types";
import { BALL_BODY, NET } from "./constants";
import { newNets, type Nets } from "./net";

const R = BALL_BODY.radius;
const HL = PITCH.halfLength;
const GW = PITCH.goalHalfWidth;
const GH = PITCH.goalHeight;
const GD = PITCH.goalDepth;

/** Plays a shot at the right hand goal for `seconds` with every surface and the nets. */
function shoot(pos: Ball["pos"], vel: Ball["vel"], seconds = 2.5, spin = { x: 0, y: 0, z: 0 }, nets: Nets = newNets()) {
  const ball = newBall();
  ball.pos = { ...pos };
  ball.vel = { ...vel };
  ball.spin = { ...spin };
  const contacts: Contact[] = [];
  let scored = false;
  let deepest = 0;
  let furthest = 0;
  for (let t = 0; t < seconds; t += STEP) {
    stepBall(ball, STEP, contacts, { nets });
    scored ||= scoredIn(ball, nets) === 1;
    deepest = Math.max(deepest, nets[1].back.depth);
    furthest = Math.max(furthest, ball.pos.x);
  }
  return { ball, contacts, scored, deepest, furthest, nets };
}

describe("the posts and the bar", () => {
  it("are round: dead centre comes back, the inside edge goes in, the outside edge goes wide", () => {
    const at = (offset: number) => shoot({ x: HL - 6, y: 0.9, z: GW + offset }, { x: 22, y: 1.2, z: 0 }, 1.5);
    const centre = at(0);
    expect(centre.contacts.some((c) => c.type === "post")).toBe(true);
    expect(centre.ball.vel.x).toBeLessThan(0);
    expect(centre.scored).toBe(false);
    const inside = at(-0.12);
    expect(inside.contacts.some((c) => c.type === "post")).toBe(true);
    expect(inside.scored).toBe(true);
    const outside = at(0.12);
    expect(outside.contacts.some((c) => c.type === "post")).toBe(true);
    expect(outside.scored).toBe(false);
    expect(Math.abs(outside.ball.pos.z)).toBeGreaterThan(GW);
  });

  it("knock a ball rising into the underside of the bar down toward the turf", () => {
    const shot = shoot({ x: HL - 8, y: 1.9, z: 0.5 }, { x: 24, y: 4.25, z: 0 }, 0.6);
    const bar = shot.contacts.find((c) => c.type === "bar");
    expect(bar).toBeDefined();
    expect(shot.ball.vel.y).toBeLessThan(0);
  });

  it("give back less from a hard strike than a soft one", () => {
    const back = (speed: number) => -shoot({ x: HL - 3, y: 1, z: GW }, { x: speed, y: 0.4, z: 0 }, 0.4).ball.vel.x / speed;
    expect(back(30)).toBeLessThan(back(10));
    expect(back(10)).toBeGreaterThan(0.45);
  });
});

describe("the net", () => {
  it("catches a hard shot: bulges out most of a metre, takes its pace and drops it in the goal", () => {
    const shot = shoot({ x: HL - 12, y: 0.6, z: 1 }, { x: 28, y: 3.4, z: 0.4 }, 3);
    expect(shot.scored).toBe(true);
    expect(shot.deepest).toBeGreaterThan(0.35);
    expect(shot.deepest).toBeLessThanOrEqual(NET.maxDepth + 1e-9);
    expect(shot.furthest).toBeLessThan(HL + GD + NET.maxDepth);
    // Dropped dead inside the goal, not fired back out into play.
    expect(shot.ball.pos.x).toBeGreaterThan(HL);
    expect(Math.hypot(shot.ball.vel.x, shot.ball.vel.z)).toBeLessThan(2);
    expect(shot.contacts.some((c) => c.type === "net")).toBe(true);
  });

  it("barely ruffles for a soft roll, and springs back to rest", () => {
    const soft = shoot({ x: HL - 2, y: R, z: 0 }, { x: 6, y: 0, z: 0 }, 4);
    expect(soft.deepest).toBeLessThan(0.3);
    expect(Math.abs(soft.nets[1].back.depth)).toBeLessThan(0.05);
  });

  it("keeps a wide shot out when it clears the end board and hits the side netting from outside", () => {
    const shot = shoot({ x: HL - 2, y: 1.4, z: GW + 1.4 }, { x: 8, y: 1.5, z: -4 }, 2);
    expect(shot.scored).toBe(false);
    expect(shot.nets[1].right.depth).toBeLessThanOrEqual(0.001);
    expect(shot.ball.pos.z).toBeGreaterThan(GW);
  });

  it("holds a lob that drops onto the roof up on top of the goal", () => {
    const shot = shoot({ x: HL - 9, y: 1, z: 0 }, { x: 10.2, y: 7.6, z: 0 }, 1.6);
    expect(shot.scored).toBe(false);
    expect(Math.min(...[shot.nets[1].roof.depth])).toBeLessThanOrEqual(0);
    expect(shot.ball.pos.y).toBeGreaterThan(GH - 0.2);
  });
});
