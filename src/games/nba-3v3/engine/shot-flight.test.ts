import { describe, expect, it } from "vitest";
import { sampleFlight, type Flight } from "./flight";
import { stepLoose, type Contact } from "./loose-ball";
import { seeded } from "./rng";
import { planShot } from "./shot-flight";
import { MAKES, MISSES, type Outcome } from "./shot-model";
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

function scores(f: Flight): boolean {
  return f.segments.some((s) => s.events.some((e) => e.kind === "score"));
}

describe("planned shot flights", () => {
  it("drops every make cleanly through the ring and scores it", () => {
    const rng = seeded(3);
    for (const outcome of MAKES) {
      for (const from of SPOTS) {
        const f = planShot(rng, { from, outcome, apex: 4.6 });
        const path = walk(f);
        expect(path.through, `${outcome} from ${from.x},${from.z}`).toBe(true);
        expect(path.intoGlass).toBe(false);
        expect(scores(f)).toBe(true);
      }
    }
  });

  it("never scores a planned miss in flight, and the loose ball rarely drops in afterwards", () => {
    const rng = seeded(9);
    let lucky = 0;
    let total = 0;
    for (const outcome of MISSES as readonly Outcome[]) {
      for (const from of SPOTS) {
        for (let i = 0; i < 10; i++) {
          const f = planShot(rng, { from, outcome, apex: 4.6 });
          expect(scores(f)).toBe(false);
          expect(walk(f).through).toBe(false);
          expect(walk(f).intoGlass, `${outcome} from ${from.x},${from.z}`).toBe(false);
          const pos = { x: 0, y: 0, z: 0 };
          const vel = { x: 0, y: 0, z: 0 };
          sampleFlight(f, f.total, pos, vel);
          const body = { pos, vel: f.exit ? { ...f.exit.v } : vel };
          const contacts: Contact[] = [];
          for (let t = 0; t < 3; t += 1 / 60) stepLoose(body, 1 / 60, contacts);
          if (contacts.some((c) => c.kind === "through")) lucky++;
          total++;
        }
      }
    }
    expect(lucky / total).toBeLessThan(0.06);
  });

  it("rims out off the iron and caroms off the glass where the outcome says", () => {
    const rng = seeded(4);
    const rim = planShot(rng, { from: SPOTS[1]!, outcome: "rimOut", apex: 4.6 });
    expect(rim.exit?.events.some((e) => e.kind === "rim")).toBe(true);
    const glass = planShot(rng, { from: SPOTS[1]!, outcome: "boardOut", apex: 4.6 });
    expect(glass.exit?.events.some((e) => e.kind === "board")).toBe(true);
    expect(glass.exit!.v.z).toBeGreaterThan(0);
    const bank = planShot(rng, { from: SPOTS[3]!, outcome: "bank", apex: 4.4 });
    expect(bank.segments[1]!.events.some((e) => e.kind === "board")).toBe(true);
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
});
