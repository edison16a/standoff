import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { clothMaterial, WEAVE } from "../cloth";
import { MeshBuilder } from "../mesh-builder";
import { buildRunner, LOOKS } from "./runner-model";
import { stitches } from "./shapes";

const rig = buildRunner(LOOKS[0]!);
const meshes: THREE.Mesh[] = [];
rig.root.traverse((node) => {
  if ((node as THREE.Mesh).isMesh) meshes.push(node as THREE.Mesh);
});

/** The weaves found on the meshes hung from one bone. */
function weavesOn(bone: string): Set<number> {
  const found = new Set<number>();
  for (const mesh of meshes) {
    if (mesh.parent?.parent?.name !== bone) continue;
    const weave = mesh.geometry.getAttribute("weave");
    for (let i = 0; weave && i < weave.count; i++) found.add(weave.getX(i));
  }
  return found;
}

describe("the runner model", () => {
  it("dresses every lit part in the shared cloth, each with its weave", () => {
    const lit = meshes.filter((m) => m.material === clothMaterial());
    expect(lit.length).toBeGreaterThan(15);
    for (const mesh of lit) expect(mesh.geometry.getAttribute("weave")).toBeDefined();
    expect(weavesOn("hips").has(WEAVE.denim)).toBe(true);
    expect(weavesOn("chest").has(WEAVE.fleece)).toBe(true);
    expect(weavesOn("ankleL").has(WEAVE.shine)).toBe(true);
  });

  it("stays cheap to draw: a mesh or two per bone, and indexed so vertices are shared", () => {
    expect(meshes.length).toBeLessThanOrEqual(30);
    for (const mesh of meshes) expect(mesh.geometry.index).not.toBeNull();
    const triangles = meshes.reduce((sum, m) => sum + m.geometry.index!.count / 3, 0);
    expect(triangles).toBeLessThan(35000);
  });

  it("stands about as tall as a kid with a big head", () => {
    rig.root.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(rig.root, true).getSize(new THREE.Vector3());
    expect(size.y).toBeGreaterThan(1.6);
    expect(size.y).toBeLessThan(1.9);
  });
});

describe("stitching", () => {
  it("lays dashes with gaps along a seam and carries the rhythm round a corner", () => {
    const count = (points: [number, number, number][]) => {
      const b = new MeshBuilder(true);
      stitches(b, points, { color: 0xffffff, finish: "satin" }, 0.014, 0.009);
      return b.build().children.reduce((n, m) => n + ((m as THREE.Mesh).geometry.getAttribute("position").count / 24), 0);
    };
    expect(count([[0, 0, 0], [0.23, 0, 0]])).toBe(10);
    // The same length bent at its middle keeps about the same number of stitches.
    expect(count([[0, 0, 0], [0.115, 0, 0], [0.115, 0.115, 0]])).toBeGreaterThanOrEqual(9);
  });
});
