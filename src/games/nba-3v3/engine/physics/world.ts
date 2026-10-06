import { RIM } from "../tuning";
import type { V3 } from "../vec";
import { airStep, type BallBody } from "./air";
import { SUBSTEP } from "./ball-spec";
import { netStep } from "./net-drag";
import { boardContact, bracketContact, floorContact, rimContact, type Touch } from "./surfaces";

/**
 * Steps a free ball: through the air, the net, the ring, its bracket,
 * the glass and the floor, always in the same small fixed steps, so a
 * path is the same every time it is flown and a fast ball can never
 * pass through the thin iron. A basket is the ball's centre going down
 * through the ring: past that point it cannot come back up.
 */

export type ContactKind = "floor" | "rim" | "board" | "through";

export interface Contact {
  kind: ContactKind;
  /** Speed into the surface, or down through the ring, in metres a second. */
  power: number;
  at: V3;
}

/** Called after every small step, for the hands of the players near the ball. */
export type TouchHook = (b: BallBody, h: number) => void;

/** The ball's centre this far below the ring, still inside it, is in. */
const THROUGH_Y = RIM.y - 0.05;
const THROUGH_R = RIM.radius - 0.02;

/** Steps `dt` seconds in whole fixed steps (a 60 Hz frame is exactly eight). */
export function stepBall(b: BallBody, dt: number, out: Contact[], hook?: TouchHook): void {
  const steps = Math.max(1, Math.round(dt / SUBSTEP));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    substep(b, h, out);
    hook?.(b, h);
  }
}

const touches: Touch[] = [];

function substep(b: BallBody, h: number, out: Contact[]): void {
  const above = b.pos.y > THROUGH_Y;
  airStep(b, h);
  netStep(b, h);
  touches.length = 0;
  rimContact(b, h, touches);
  bracketContact(b, touches);
  boardContact(b, touches);
  floorContact(b, h, touches);
  for (const t of touches) out.push(t);
  const { pos, vel } = b;
  if (above && pos.y <= THROUGH_Y && vel.y < 0 && Math.sqrt((pos.x - RIM.x) ** 2 + (pos.z - RIM.z) ** 2) < THROUGH_R) {
    out.push({ kind: "through", power: -vel.y, at: { x: pos.x, y: pos.y, z: pos.z } });
  }
}
