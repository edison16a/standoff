import { describe, expect, it } from "vitest";
import type { BallBody } from "../physics/air";
import { BALL } from "../physics/ball-spec";
import type { Contact } from "../physics/world";
import { BOARD, RIM, STEP } from "../tuning";
import { newFlight, stepShotFlight } from "./flight";
import { ridePoint, startRide } from "./rim-ride";
import { traceFlight } from "./trace";

const TOUCH = BALL.radius + RIM.tube;

/** A soft ball dropping onto the right side of the ring, drifting along it. */
function dropOnRing(): BallBody {
  return { pos: { x: RIM.x + RIM.radius, y: RIM.y + 0.5, z: RIM.z - 0.1 }, vel: { x: 0, y: -2.5, z: 1.2 }, w: { x: 0, y: 0, z: 0 } };
}

/** Distance from the ball's centre to the middle of the ring's tube. */
function offTube(p: { x: number; y: number; z: number }): number {
  const hl = Math.hypot(p.x - RIM.x, p.z - RIM.z);
  return Math.hypot(hl - RIM.radius, p.y - RIM.y);
}

describe("the roll round the ring", () => {
  it("only starts from a touch on top of the ring", () => {
    const below = { pos: { x: RIM.x + RIM.radius, y: RIM.y - 0.1, z: RIM.z }, vel: { x: 0, y: 2, z: 0 }, w: { x: 0, y: 0, z: 0 } };
    expect(startRide({ laps: 1, drop: "in" }, below)).toBeNull();
  });

  it("rides on the tube after the hop, turning the laps it was given in about a second", () => {
    const b = dropOnRing();
    b.pos.y = RIM.y + TOUCH;
    const r = startRide({ laps: 1.2, drop: "in" }, b)!;
    expect(r.dur).toBeGreaterThan(0.5);
    expect(r.dur).toBeLessThan(1.4);
    for (let t = r.hopT + 0.01; t < r.dur * 0.7; t += 0.02) expect(Math.abs(offTube(ridePoint(r, t)) - TOUCH)).toBeLessThan(0.002);
    // Sum the turn step by step round the ring.
    let turned = 0;
    let last = Math.atan2(b.pos.z - RIM.z, b.pos.x - RIM.x);
    for (let t = 0.01; t <= r.dur; t += 0.01) {
      const p = ridePoint(r, t);
      const a = Math.atan2(p.z - RIM.z, p.x - RIM.x);
      turned += Math.atan2(Math.sin(a - last), Math.cos(a - last));
      last = a;
    }
    expect(Math.abs(turned) / (Math.PI * 2)).toBeCloseTo(r.spec.laps, 1);
  });

  it("drops through after a roll in, and off the iron after a roll out", () => {
    const rollIn = traceFlight(dropOnRing(), { laps: 1.2, drop: "in" });
    expect(rollIn.rode).toBe(true);
    expect(rollIn.made).toBe(true);
    expect(rollIn.outcome).toBe("roll");
    const rollOut = traceFlight(dropOnRing(), { laps: 1, drop: "out" });
    expect(rollOut.rode).toBe(true);
    expect(rollOut.made).toBe(false);
    expect(rollOut.outcome).toBe("inOut");
  });

  it("moves smoothly, ticks the iron as it goes, and spins as it rolls", () => {
    const b = dropOnRing();
    const f = newFlight({ laps: 1.4, drop: "in" });
    const contacts: Contact[] = [];
    let ticks = 0;
    let fastest = 0;
    for (let t = 0; t < 2.5; t += STEP) {
      contacts.length = 0;
      stepShotFlight(b, f, STEP, contacts);
      if (!f.riding) continue;
      ticks += contacts.filter((c) => c.kind === "rim").length;
      fastest = Math.max(fastest, Math.hypot(b.vel.x, b.vel.y, b.vel.z));
      // Rolling without slipping: the spin times the radius matches the speed along the iron.
      expect(Math.hypot(b.w.x, b.w.y, b.w.z) * BALL.radius).toBeCloseTo(Math.hypot(b.vel.x, b.vel.y, b.vel.z), 0);
    }
    expect(f.rode).toBe(true);
    expect(ticks).toBeGreaterThan(3);
    expect(fastest).toBeLessThan(5);
  });

  it("never pushes the ball into the glass behind the ring, even tipping out at the back", () => {
    for (const drop of ["in", "out"] as const) {
      // Landing outside the back of the ring, rolling round it.
      const b: BallBody = { pos: { x: RIM.x + 0.05, y: RIM.y + 0.12, z: RIM.z - RIM.radius - 0.08 }, vel: { x: 1.5, y: -2, z: 0 }, w: { x: 0, y: 0, z: 0 } };
      const r = startRide({ laps: 1.5, drop }, b)!;
      for (let t = 0; t <= r.dur; t += STEP / 4) expect(ridePoint(r, t).z, `${drop} ${t}`).toBeGreaterThanOrEqual(BOARD.face + BALL.radius - 1e-9);
    }
  });
});

