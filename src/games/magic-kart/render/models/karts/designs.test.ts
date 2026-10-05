import type * as THREE from "three";
import { describe, expect, it } from "vitest";
import { CHARACTER_IDS } from "../../../characters";
import { kartDesign } from "./index";

const triangles = (g: THREE.BufferGeometry) => (g.index ? g.index.count : g.getAttribute("position").count) / 3;

/**
 * Every kart builds, carries what the one kart material needs, and stays
 * inside its triangle budget near and far, so four of them in four views
 * still draw at full frame rate.
 */
describe("kart designs", () => {
  for (const id of CHARACTER_IDS) {
    it(`${id} builds within budget`, () => {
      const d = kartDesign(id);
      const far = d.far!;
      for (const g of [d.body, d.driver, ...d.wheels.map((w) => w.geometry), far.body, far.driver, ...far.wheels]) {
        for (const name of ["position", "normal", "uv", "color", "finish"]) expect(g.getAttribute(name), name).toBeTruthy();
        expect(g.index, "shared corners").toBeTruthy();
        expect(Array.from(g.getAttribute("position").array).every(Number.isFinite)).toBe(true);
      }
      expect(d.driver.getAttribute("skinIndex")).toBeTruthy();
      expect(far.driver.getAttribute("skinIndex")).toBeTruthy();
      expect(d.wheels).toHaveLength(4);
      const near = triangles(d.body) + triangles(d.driver) + d.wheels.reduce((n, w) => n + triangles(w.geometry), 0);
      const coarse = triangles(far.body) + triangles(far.driver) + far.wheels.reduce((n, w) => n + triangles(w), 0);
      expect(near).toBeLessThan(80000);
      expect(coarse).toBeLessThan(near * 0.4);
    });
  }

  it("shares one build between copies", () => {
    expect(kartDesign("blaze")).toBe(kartDesign("blaze"));
  });
});
