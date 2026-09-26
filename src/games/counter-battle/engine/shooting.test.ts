import { describe, expect, it } from "vitest";
import type { Piece } from "./arena";
import { eyeOf, targetPoints } from "./fighter";
import { falloffDamage, GUNS } from "./guns";
import { castRay, rayFighter } from "./hit";
import { Rng } from "./rng";
import { coneOf, pelletOffsets, resolveShot } from "./shooting";
import { angles, fighterAt } from "./test-helpers";
import { dir3 } from "./vec";

const wall: Piece = { id: 0, kind: "wall", x: 0, z: 5, shape: { type: "box", hw: 2, hd: 0.25 }, h: 2.2 };
const world = (fighters: ReturnType<typeof fighterAt>[], pieces: Piece[] = []) => ({ pieces, fighters, rng: new Rng(3), now: 1 });

describe("hit tests", () => {
  it("count a head shot only when the ray meets the head first", () => {
    const target = fighterAt(1, 1, 0, 10);
    const o = { x: 0, y: 1.64, z: 0 };
    expect(rayFighter(o, { x: 0, y: 0, z: 1 }, target)).toEqual({ t: expect.closeTo(10 - 0.14, 3), head: true });
    const chest = rayFighter({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }, target)!;
    expect(chest.head).toBe(false);
    expect(chest.t).toBeCloseTo(9.7);
    expect(rayFighter({ x: 1, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }, target)).toBeNull();
  });

  it("stop at cover before a fighter behind it, and never hit the shooter", () => {
    const shooter = fighterAt(0, 0, 0, 0);
    const target = fighterAt(1, 1, 0, 10);
    const d = { x: 0, y: 0, z: 1 };
    const hit = castRay(eyeOf(shooter), d, [wall], [shooter, target], shooter.id);
    expect(hit.trace.hit).toEqual({ type: "cover", piece: 0 });
    expect(hit.t).toBeCloseTo(4.75);
    // Level from the eye, the bullet meets the head.
    expect(castRay(eyeOf(shooter), d, [], [shooter, target], shooter.id).trace.hit).toEqual({ type: "fighter", id: 1, head: true });
  });

  it("lands on the floor when aimed down, and flies on when aimed at nothing", () => {
    const shooter = fighterAt(0, 0, 0, 0);
    expect(castRay(eyeOf(shooter), dir3(0, -0.3), [], [shooter], 0).trace.hit.type).toBe("floor");
    expect(castRay(eyeOf(shooter), dir3(0, 0.3), [], [shooter], 0).trace.hit.type).toBe("none");
  });

  it("hits a crouched body lower down, and misses over it", () => {
    const target = fighterAt(1, 1, 0, 10);
    target.crouch = 1;
    expect(rayFighter({ x: 0, y: 1.3, z: 0 }, { x: 0, y: 0, z: 1 }, target)).toBeNull();
    expect(rayFighter({ x: 0, y: 0.6, z: 0 }, { x: 0, y: 0, z: 1 }, target)).not.toBeNull();
  });
});

describe("a shot", () => {
  it("does more damage to the head, with falloff over range", () => {
    const run = (aimAt: "head" | "chest") => {
      const shooter = fighterAt(0, 0, 0, 0, "rifle");
      const target = fighterAt(1, 1, 0, 40);
      const events = resolveShot(shooter, angles(eyeOf(shooter), targetPoints(target)[aimAt]), 0, world([shooter, target]));
      return events.find((e) => e.type === "hit");
    };
    const head = run("head");
    const chest = run("chest");
    expect(head).toMatchObject({ head: true });
    expect(chest).toMatchObject({ head: false, damage: Math.round(falloffDamage(GUNS.rifle, 39.7)) });
    expect(head!.type === "hit" && chest!.type === "hit" && head.damage > chest.damage).toBe(true);
  });

  it("sums a shotgun blast into one hit, and downs someone up close", () => {
    const shooter = fighterAt(0, 0, 0, 0, "shotgun");
    const target = fighterAt(1, 1, 0, 3);
    const events = resolveShot(shooter, angles(eyeOf(shooter), targetPoints(target).chest), coneOf(shooter), world([shooter, target]));
    expect(events.filter((e) => e.type === "hit")).toHaveLength(1);
    expect(events[0]!.type === "shot" && events[0].traces.length).toBe(GUNS.shotgun.pellets);
    expect(events.some((e) => e.type === "kill")).toBe(true);
    expect(target.alive).toBe(false);
    expect(shooter.kills).toBe(1);
  });

  it("puts a sniper head shot down in one", () => {
    const shooter = fighterAt(0, 0, 0, 0, "sniper");
    const target = fighterAt(1, 1, 0, 45);
    const events = resolveShot(shooter, angles(eyeOf(shooter), targetPoints(target).head), 0, world([shooter, target]));
    expect(events.find((e) => e.type === "kill")).toMatchObject({ head: true, gun: "sniper", killer: 0, victim: 1 });
  });

  it("never hurts a teammate", () => {
    const shooter = fighterAt(0, 0, 0, 0, "rifle");
    const mate = fighterAt(1, 0, 0, 6);
    const events = resolveShot(shooter, angles(eyeOf(shooter), targetPoints(mate).chest), 0, world([shooter, mate]));
    expect(events.some((e) => e.type === "hit")).toBe(false);
    expect(mate.health).toBe(100);
  });

  it("is stopped by cover", () => {
    const shooter = fighterAt(0, 0, 0, 0, "rifle");
    const target = fighterAt(1, 1, 0, 10);
    const events = resolveShot(shooter, angles(eyeOf(shooter), targetPoints(target).chest), 0, world([shooter, target], [wall]));
    expect(events).toHaveLength(1);
    expect(events[0]!.type === "shot" && events[0].traces[0]!.hit).toEqual({ type: "cover", piece: 0 });
  });
});

describe("spread", () => {
  it("keeps every pellet inside the cone", () => {
    const rng = new Rng(9);
    for (const gun of [GUNS.rifle, GUNS.shotgun]) {
      const offsets = pelletOffsets(gun, 0.05, rng);
      expect(offsets).toHaveLength(gun.pellets);
      for (const o of offsets) expect(Math.hypot(o.x, o.y)).toBeLessThanOrEqual(0.05 * 1.15 + 1e-9);
    }
  });

  it("widens on the run and tightens in a crouch", () => {
    const f = fighterAt(0, 0, 0, 0, "rifle");
    const still = coneOf(f);
    f.vel = { x: GUNS.rifle.speed, z: 0 };
    expect(coneOf(f)).toBeGreaterThan(still * 3);
    f.vel = { x: 0, z: 0 };
    f.crouch = 1;
    expect(coneOf(f)).toBeLessThan(still);
  });
});
