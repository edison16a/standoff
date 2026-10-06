import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { BUILD_IDS, BUILDS } from "../../builds";
import { athleteGeometry, type AthleteGeometry } from "./athlete-geometry";
import { egg, loft, ringY } from "./loft";

const triangles = (g: THREE.BufferGeometry) => (g.index ? g.index.count : g.getAttribute("position").count) / 3;

function all(geo: AthleteGeometry): THREE.BufferGeometry[] {
  return [geo.skin, geo.kit, geo.gear];
}

function bounds(geos: THREE.BufferGeometry[]): THREE.Box3 {
  const box = new THREE.Box3();
  for (const g of geos) {
    g.computeBoundingBox();
    box.union(g.boundingBox!);
  }
  return box;
}

/** A skinned mesh of one geometry on the rig's bones, bound at rest. */
function skinned(geo: AthleteGeometry, part: THREE.BufferGeometry): THREE.SkinnedMesh {
  const mesh = new THREE.SkinnedMesh(part, new THREE.MeshBasicMaterial());
  geo.rig.joints.root.add(mesh);
  geo.rig.joints.root.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(geo.rig.bones));
  return mesh;
}

describe("loft", () => {
  it("faces every side of a tube outward", () => {
    const rings = [0, 0.5, 1].map((y) => ringY(0, y, 0, 16, egg(0.2, 0.2, 0.3, 0.3)));
    const geo = loft(rings);
    const pos = geo.getAttribute("position");
    const nrm = geo.getAttribute("normal");
    const p = new THREE.Vector3();
    const n = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).setY(0);
      n.fromBufferAttribute(nrm, i);
      expect(n.dot(p)).toBeGreaterThan(0);
    }
  });
});

describe("athlete geometry", () => {
  const fine = Object.fromEntries(BUILD_IDS.map((id) => [id, athleteGeometry(BUILDS[id], true)]));

  it("has sane positions and skin weights that add up for every build", () => {
    for (const id of BUILD_IDS) {
      const geo = fine[id]!;
      const bones = geo.rig.bones.length;
      let bad = 0;
      for (const g of all(geo)) {
        const pos = g.getAttribute("position");
        const w = g.getAttribute("skinWeight");
        const k = g.getAttribute("skinIndex");
        for (let i = 0; i < pos.count; i++) {
          if (!Number.isFinite(pos.getX(i) + pos.getY(i) + pos.getZ(i))) bad++;
          if (Math.abs(w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i) - 1) > 1e-4) bad++;
          if (Math.max(k.getX(i), k.getY(i), k.getZ(i), k.getW(i)) >= bones) bad++;
        }
      }
      expect(bad).toBe(0);
    }
  });

  it("stands on the floor and stands as tall as the build", () => {
    for (const id of BUILD_IDS) {
      const box = bounds(all(fine[id]!));
      const h = BUILDS[id].body.height;
      expect(box.min.y).toBeGreaterThan(-0.005);
      expect(box.min.y).toBeLessThan(0.01);
      // Hair can add a little on top.
      expect(box.max.y / h).toBeGreaterThan(0.96);
      expect(box.max.y / h).toBeLessThan(1.05);
    }
  });

  it("stays within its triangle budget, and the light build is about half", () => {
    for (const id of BUILD_IDS) {
      const high = all(fine[id]!).reduce((n, g) => n + triangles(g), 0);
      const low = all(athleteGeometry(BUILDS[id], false)).reduce((n, g) => n + triangles(g), 0);
      expect(high).toBeLessThan(38000);
      expect(low).toBeLessThan(high * 0.55);
    }
  });

  it("bends the forearm's skin with the elbow", () => {
    const geo = athleteGeometry(BUILDS.shooter, false);
    const mesh = skinned(geo, geo.skin);
    const { elbowL, handL } = geo.rig.joints;
    const wrist = handL.getWorldPosition(new THREE.Vector3());
    // The skin vertex nearest the left wrist at rest.
    const pos = geo.skin.getAttribute("position");
    let best = -1;
    let bestD = Infinity;
    const p = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const d = p.fromBufferAttribute(pos, i).distanceTo(wrist);
      if (d < bestD) [best, bestD] = [i, d];
    }
    elbowL.rotation.x = -Math.PI / 2;
    geo.rig.joints.root.updateMatrixWorld(true);
    mesh.skeleton.update();
    const moved = mesh.getVertexPosition(best, new THREE.Vector3());
    const wristNow = handL.getWorldPosition(new THREE.Vector3());
    expect(moved.distanceTo(wristNow)).toBeLessThan(bestD + 0.02);
    expect(moved.distanceTo(wrist)).toBeGreaterThan(0.15);
  });

  it("dresses the referee in long trousers rather than shorts", () => {
    const ref = athleteGeometry(BUILDS.shooter, false, true);
    const player = athleteGeometry(BUILDS.shooter, false);
    expect(bounds([ref.kit]).min.y).toBeLessThan(bounds([player.kit]).min.y - 0.3);
  });
});
