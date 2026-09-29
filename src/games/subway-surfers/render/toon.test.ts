import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { MeshBuilder } from "./mesh-builder";
import { inkMaterial, toonLevel } from "./toon";

describe("the toon ramp", () => {
  it("never gets darker as a surface turns toward the sun", () => {
    let last = -1;
    for (let i = 0; i <= 100; i++) {
      const level = toonLevel(i / 100);
      expect(level).toBeGreaterThanOrEqual(last - 1e-9);
      last = level;
    }
  });

  it("has a shade band, a soft edge and full sun, with some light left in the shade", () => {
    expect(toonLevel(0)).toBeGreaterThan(0.05);
    expect(toonLevel(0.3)).toBeCloseTo(toonLevel(0), 5);
    expect(toonLevel(0.7)).toBeGreaterThan(0.7);
    expect(toonLevel(1)).toBeCloseTo(1, 5);
  });
});

describe("ink outlines", () => {
  const box = (outline: number) => new MeshBuilder().outline(outline).box(2, 1, 4, 0xff0000, [0, 0.5, 0]).build();
  const inked = (group: THREE.Group) => group.children.find((c) => (c as THREE.Mesh).material === inkMaterial()) as THREE.Mesh | undefined;

  it("add a hull grown by the thickness all round, drawn inside out", () => {
    const hull = inked(box(0.05));
    expect(hull).toBeDefined();
    hull!.geometry.computeBoundingBox();
    const size = hull!.geometry.boundingBox!.getSize(new THREE.Vector3());
    expect(size.x).toBeCloseTo(2.1, 5);
    expect(size.y).toBeCloseTo(1.1, 5);
    expect(size.z).toBeCloseTo(4.1, 5);
    expect(inkMaterial().side).toBe(THREE.BackSide);
  });

  it("are left off when the thickness is zero, and panels never get one", () => {
    expect(inked(box(0))).toBeUndefined();
    const panel = new MeshBuilder().outline(0.05).panel(1, 1, 0xffffff, [0, 0, 0]).build();
    expect(inked(panel)).toBeUndefined();
  });

  it("merge every outlined part into one extra draw", () => {
    const b = new MeshBuilder().outline(0.03);
    for (let i = 0; i < 5; i++) b.box(1, 1, 1, 0x00ff00, [i * 2, 0, 0]).sphere(0.4, 0x0000ff, [i * 2, 1, 0]);
    expect(b.build().children).toHaveLength(2);
  });
});
