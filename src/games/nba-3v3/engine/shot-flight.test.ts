import { describe, expect, it } from "vitest";
import { sampleFlight, type Flight } from "./flight";
import { stepLoose, type Contact } from "./loose-ball";
import { seeded } from "./rng";
import { planShot } from "./shot-flight";
import { MAKES, MISSES, isMake, type Outcome } from "./shot-model";
import { scriptedShot } from "./shot-script";
import { BALL, BOARD, RIM } from "./tuning";

const SPOTS = [
  { x: 0, y: 2.6, z: 8.8 },
  { x: -5.5, y: 2.7, z: 5.8 },
  { x: 6.8, y: 2.5, z: 1.2 },
  { x: 2.5, y: 2.4, z: 4.5 },
  { x: -1, y: 3.1, z: 2.4 },
];

/** Walks a flight in small steps and reports whether it dropped through the ring and whether it ever went into the glass. */
function walk(f: Flight): { through: boolean; intoGlass: boolean } {
  const pos = { x: 0, y: 0, z: 0 };
  const vel = { x: 0, y: 0, z: 0 };
  let through = false;
  let intoGlass = false;
  let lastY = Infinity;
  for (let t = 0; t <= f.total; t += 1 / 240) {
    sampleFlight(f, t, pos, vel);
    const fromAxis = Math.hypot(pos.x - RIM.x, pos.z - RIM.z);
    if (lastY > RIM.y && pos.y <= RIM.y && fromAxis < RIM.radius - BALL.radius * 0.5) through = true;
    const onGlass = Math.abs(pos.x - RIM.x) < BOARD.halfWidth && pos.y > BOARD.bottom && pos.y < BOARD.top;
    if (onGlass && pos.z < BOARD.face + BALL.radius - 0.02) intoGlass = true;
    lastY = pos.y;
  }
  return { through, intoGlass };
}

const scores = (f: Flight) => f.segments.some((s) => s.events.some((e) => e.kind === "score"));
const touches = (f: Flight, kind: "rim" | "board") => f.segments.some((s) => s.events.some((e) => e.kind === kind));
const tracked = (f: Flight) => f.segments.every((s) => s.type === "track");

describe("shots flown on the ball physics", () => {
  it("keeps every make a make and every miss a miss, whatever the style", () => {
    const rng = seeded(3);
    for (const outcome of [...MAKES, ...MISSES] as Outcome[]) {
      for (const from of SPOTS) {
        const { flight, outcome: got } = planShot(rng, { from, outcome, apex: 4.6 });
        expect(isMake(got), `${outcome} from ${from.x},${from.z}`).toBe(isMake(outcome));
        const path = walk(flight);
        expect(path.through).toBe(isMake(outcome));
        expect(scores(flight)).toBe(isMake(outcome));
        expect(path.intoGlass).toBe(false);
      }
    }
  });

  it("finds a physical path for nearly every shot, and mostly the style asked for", () => {
    const rng = seeded(11);
    let physical = 0;
    let same = 0;
    let total = 0;
    for (const outcome of ["swish", "bounce", "rimOut", "bank", "inOut", "roll"] as Outcome[]) {
      for (const from of SPOTS.slice(0, 4)) {
        for (let i = 0; i < 3; i++) {
          const shot = planShot(rng, { from, outcome, apex: 4.7, backspin: 15 });
          if (tracked(shot.flight)) physical++;
          if (shot.outcome === outcome) same++;
          total++;
        }
      }
    }
    expect(physical / total).toBeGreaterThan(0.9);
    expect(same / total).toBeGreaterThan(0.6);
  });

  it("touches the iron or the glass exactly as the named outcome says", () => {
    const rng = seeded(4);
    for (let i = 0; i < 6; i++) {
      const swish = planShot(rng, { from: SPOTS[0]!, outcome: "swish", apex: 4.8 });
      if (swish.outcome === "swish") expect(touches(swish.flight, "rim") || touches(swish.flight, "board")).toBe(false);
      const bank = planShot(rng, { from: SPOTS[3]!, outcome: "bank", apex: 4.4 });
      if (bank.outcome === "bank") expect(touches(bank.flight, "board")).toBe(true);
      const out = planShot(rng, { from: SPOTS[1]!, outcome: "rimOut", apex: 4.6 });
      expect(touches(out.flight, "rim") || touches(out.flight, "board") || out.outcome === "airball").toBe(true);
    }
  });

  it("hands a miss over to the loose ball physics clear of the ring, so it almost never drops in after", () => {
    const rng = seeded(9);
    let lucky = 0;
    let total = 0;
    for (const outcome of MISSES as readonly Outcome[]) {
      for (const from of SPOTS) {
        for (let i = 0; i < 4; i++) {
          const { flight } = planShot(rng, { from, outcome, apex: 4.6 });
          const pos = { x: 0, y: 0, z: 0 };
          const vel = { x: 0, y: 0, z: 0 };
          sampleFlight(flight, flight.total, pos, vel);
          const body = { pos, vel: flight.exit ? { ...flight.exit.v } : vel, w: flight.exit?.spin };
          const contacts: Contact[] = [];
          for (let t = 0; t < 3; t += 1 / 60) stepLoose(body, 1 / 60, contacts);
          if (contacts.some((c) => c.kind === "through")) lucky++;
          total++;
        }
      }
    }
    expect(lucky / total).toBeLessThan(0.06);
  });

  it("keeps the scripted fallback paths clean", () => {
    const rng = seeded(5);
    for (const outcome of MAKES) {
      const f = scriptedShot(rng, { from: SPOTS[1]!, outcome, apex: 4.6 });
      expect(walk(f).through).toBe(true);
      expect(scores(f)).toBe(true);
    }
  });
});

describe("a loose ball", () => {
  it("bounces lower each time and comes to rest on the floor", () => {
    const body = { pos: { x: 3, y: 2, z: 6 }, vel: { x: 0.5, y: 0, z: 0 } };
    const contacts: Contact[] = [];
    for (let t = 0; t < 8; t += 1 / 60) stepLoose(body, 1 / 60, contacts);
    const floors = contacts.filter((c) => c.kind === "floor").map((c) => c.power);
    expect(floors.length).toBeGreaterThan(2);
    for (let i = 1; i < floors.length; i++) expect(floors[i]!).toBeLessThan(floors[i - 1]!);
    expect(body.pos.y).toBeCloseTo(BALL.radius, 2);
  });

  it("comes back up to about two thirds of the drop, as a regulation ball should", () => {
    const body = { pos: { x: 3, y: 1.8 + BALL.radius, z: 6 }, vel: { x: 0, y: 0, z: 0 } };
    const contacts: Contact[] = [];
    let top = 0;
    let bounced = false;
    for (let t = 0; t < 2; t += 1 / 240) {
      stepLoose(body, 1 / 240, contacts);
      if (contacts.length) bounced = true;
      if (bounced) top = Math.max(top, body.pos.y - BALL.radius);
    }
    expect(top).toBeGreaterThan(1.1);
    expect(top).toBeLessThan(1.4);
  });

  it("bounces off the rim when dropped onto the iron, and counts when dropped through the middle", () => {
    const onIron = { pos: { x: RIM.x + RIM.radius, y: 3.8, z: RIM.z }, vel: { x: 0, y: 0, z: 0 } };
    const hits: Contact[] = [];
    for (let t = 0; t < 1; t += 1 / 60) stepLoose(onIron, 1 / 60, hits);
    expect(hits.some((c) => c.kind === "rim")).toBe(true);
    expect(hits.some((c) => c.kind === "through")).toBe(false);
    const clean = { pos: { x: RIM.x, y: 3.8, z: RIM.z }, vel: { x: 0, y: 0, z: 0 } };
    const drops: Contact[] = [];
    for (let t = 0; t < 1; t += 1 / 60) stepLoose(clean, 1 / 60, drops);
    expect(drops.some((c) => c.kind === "through")).toBe(true);
  });

  it("checks up off the floor with backspin and skips on with topspin", () => {
    const skip = (spin: number) => {
      const body = { pos: { x: 3, y: 0.6, z: 6 }, vel: { x: 3, y: -2, z: 0 }, w: { x: 0, y: 0, z: spin } };
      const contacts: Contact[] = [];
      for (let i = 0; i < 60 && !contacts.length; i++) stepLoose(body, 1 / 120, contacts);
      return body.vel.x;
    };
    // For a ball rolling toward +x, backspin turns about +z: the bottom of the ball runs forward and the floor grabs it.
    expect(skip(20)).toBeLessThan(skip(0));
    expect(skip(0)).toBeLessThan(skip(-20));
  });
});
