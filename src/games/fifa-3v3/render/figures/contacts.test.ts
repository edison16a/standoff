import { describe, expect, it } from "vitest";
import type { MatchView } from "../../engine/view";
import { BUILDS } from "../../builds";
import type { AthleteFigure } from "./athlete-figure";
import { Contacts } from "./contacts";

/** A figure that only records its knocks. */
function figure(build: keyof typeof BUILDS) {
  const knocks: { x: number; z: number; strength: number }[] = [];
  const f = { spec: { look: BUILDS[build].look }, knock: (x: number, z: number, strength: number) => knocks.push({ x, z, strength }) };
  return { f: f as unknown as AthleteFigure, knocks };
}

const view = (ax: number, bx: number) => ({ athletes: [{ x: ax, z: 0 }, { x: bx, z: 0 }] }) as unknown as MatchView;

describe("Contacts", () => {
  it("rocks two players running into each other apart, the lighter one more", () => {
    const heavy = figure("defender");
    const light = figure("playmaker");
    const c = new Contacts();
    const dt = 1 / 60;
    c.update(view(0, 0.8), [heavy.f, light.f], dt);
    c.update(view(0.05, 0.7), [heavy.f, light.f], dt);
    expect(heavy.knocks).toHaveLength(1);
    expect(light.knocks).toHaveLength(1);
    expect(heavy.knocks[0]!.x).toBeLessThan(0);
    expect(light.knocks[0]!.x).toBeGreaterThan(0);
    expect(light.knocks[0]!.strength).toBeGreaterThan(heavy.knocks[0]!.strength);
  });

  it("leaves players who are standing close but still alone", () => {
    const a = figure("striker");
    const b = figure("winger");
    const c = new Contacts();
    for (let i = 0; i < 10; i++) c.update(view(0, 0.6), [a.f, b.f], 1 / 60);
    expect(a.knocks).toHaveLength(0);
  });
});
