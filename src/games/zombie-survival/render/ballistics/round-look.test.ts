import { describe, expect, it } from "vitest";
import { WEAPONS } from "../../engine/weapons";
import { roundColour, roundIndex, roundKind } from "./round-look";

describe("which rounds are tracers", () => {
  it("counts rounds from the top of a full magazine", () => {
    expect(roundIndex("rifle", WEAPONS.rifle.magazine - 1)).toBe(0);
    expect(roundIndex("rifle", 0)).toBe(WEAPONS.rifle.magazine - 1);
  });

  it("loads every third rifle round as a tracer", () => {
    const kinds = [29, 28, 27, 26, 25, 24].map((left) => roundKind("rifle", left));
    expect(kinds).toEqual(["heat", "heat", "tracer", "heat", "heat", "tracer"]);
  });

  it("loads every fourth SMG round as a tracer", () => {
    const magazine = WEAPONS.smg.magazine;
    const tracers = Array.from({ length: magazine }, (_, i) => roundKind("smg", magazine - 1 - i)).filter((k) => k === "tracer");
    expect(tracers.length).toBe(Math.floor(magazine / 4));
  });

  it("fires buckshot as pellets, never tracers", () => {
    for (let left = 0; left < WEAPONS.shotgun.magazine; left++) expect(roundKind("shotgun", left)).toBe("pellet");
  });
});

describe("round colours", () => {
  it("burns a tracer in the shooter's colour blended with hot orange", () => {
    const blue = { r: 0.1, g: 0.3, b: 1 };
    const out = roundColour("tracer", blue, { r: 0, g: 0, b: 0 });
    expect(out.b).toBeGreaterThan(0.12);
    expect(out.b).toBeLessThan(1);
    expect(out.r).toBeGreaterThan(out.g);
  });

  it("gives ordinary rounds the same shimmer whoever fires them", () => {
    const a = roundColour("heat", { r: 1, g: 0, b: 0 }, { r: 0, g: 0, b: 0 });
    const b = roundColour("heat", { r: 0, g: 0, b: 1 }, { r: 0, g: 0, b: 0 });
    expect(a).toEqual(b);
  });
});
