import { describe, expect, it } from "vitest";
import { CHARACTER_IDS } from "../../../characters";
import { kartDesign } from "./index";

const triangles = (g: { getAttribute(n: string): { count: number } }) => g.getAttribute("position").count / 3;

/**
 * Every kart builds, carries what the one kart material needs, and stays
 * inside its triangle budget, so four of them in four views still draw
 * at full frame rate.
 */
describe("kart designs", () => {
  for (const id of CHARACTER_IDS) {
    it(`${id} builds within budget`, () => {
      const d = kartDesign(id);
      for (const g of [d.body, d.driver, ...d.wheels.map((w) => w.geometry)]) {
        for (const name of ["position", "normal", "uv", "color", "finish"]) expect(g.getAttribute(name), name).toBeTruthy();
        const pos = g.getAttribute("position").array;
        expect(Array.from(pos).every(Number.isFinite)).toBe(true);
      }
      expect(d.driver.getAttribute("skinIndex")).toBeTruthy();
      expect(d.wheels).toHaveLength(4);
      const wheelTris = triangles(d.wheels[0]!.geometry) * 2 + triangles(d.wheels[2]!.geometry) * 2;
      const total = triangles(d.body) + triangles(d.driver) + wheelTris;
      console.log(id, triangles(d.body), triangles(d.driver), triangles(d.wheels[0]!.geometry), triangles(d.wheels[2]!.geometry));
      expect(total).toBeLessThan(80000);
    });
  }

  it("shares one build between copies", () => {
    expect(kartDesign("blaze")).toBe(kartDesign("blaze"));
  });
});
