import * as THREE from "three";
import type { Track } from "../../engine/track";
import { beachBall, lighthouse, palmTree, rock, sailboat, umbrella } from "./beach-props";
import { softDot } from "../textures";
import { instances, propMaterial } from "./instances";
import { liquidMaterial, liquidSheet } from "./liquid";
import { buildTerrain, scatter, seeded, trackBounds } from "./terrain";
import type { Scenery } from "./scenery";

const SAND = new THREE.Color("#f2dfb0");
const WET = new THREE.Color("#d9c08a");
const GRASS = new THREE.Color("#9ccc65");

function smooth(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Sunny Shores: dunes of pale sand that roll down into a turquoise sea on
 * the west, a lagoon under the big jump, palm trees and umbrellas along
 * the road, a lighthouse on the point and a sailboat out at sea.
 */
export function buildBeach(track: Track): Scenery {
  const group = new THREE.Group();
  const random = seeded(7);
  const b = trackBounds(track);
  const coast = b.minX - 18;
  const lagoons = track.gaps.map((gap) => track.pointAt((gap.start + gap.end) / 2, 0));

  const terrain = buildTerrain(track, {
    margin: 220,
    cell: 5,
    height(x, z, near) {
      const off = near.dist - track.edge;
      let h = off < 3 ? -0.08 : -0.08 + smooth(3, 60, off) * (2.5 + Math.sin(x * 0.05) * Math.cos(z * 0.04) * 2);
      // The west slopes away under the sea.
      h -= smooth(coast + 6, coast - 40, x) * (h + 6);
      for (const lagoon of lagoons) {
        const r = Math.hypot(x - lagoon.x, z - lagoon.z);
        if (r < 30) h = Math.min(h, -3 * (1 - (r / 30) ** 2) - 0.1);
      }
      return h;
    },
    color(x, z, h, near, out) {
      out.copy(SAND);
      if (h < 0.2 && near.dist > track.edge + 2) out.lerp(WET, smooth(0.2, -0.6, h));
      if (h > 2.2) out.lerp(GRASS, smooth(2.2, 3.6, h) * 0.8);
      out.offsetHSL(0, 0, Math.sin(x * 0.3) * Math.sin(z * 0.27) * 0.02);
    },
  });
  group.add(terrain.mesh);
  const ground = terrain.heightAt;
  // Only on dry sand: not in the sea, not in the lagoon under the jump.
  const dry = (p: { x: number; z: number }) => p.x > coast + 4 && ground(p.x, p.z) > -0.25;

  const water = liquidMaterial({ shallow: "#3fe0d0", deep: "#1b8fd6", crest: "#ffffff", glow: false, scale: 14 });
  group.add(liquidSheet(water, 2400, 2400, coast - 1200 + 30, -0.55, (b.minZ + b.maxZ) / 2));
  for (const lagoon of lagoons) group.add(liquidSheet(water, 58, 58, lagoon.x, -0.7, lagoon.z));

  const mat = propMaterial();
  const palms = [palmTree(0.18, 8), palmTree(-0.12, 9.5), palmTree(0.26, 7)];
  // A row along the verge like the cover's, then more scattered over the dunes.
  const verge = scatter(track, 90, track.edge + 2.5, track.edge + 9, random);
  const palmSpots = [...verge, ...scatter(track, 150, track.edge + 9, track.edge + 45, random)]
    .filter(dry)
    .map((p) => ({ ...p, y: ground(p.x, p.z) - 0.1, rotY: random() * Math.PI * 2, scale: 0.8 + random() * 0.45 }));
  palms.forEach((geo, i) => group.add(instances(geo, mat, palmSpots.filter((_, k) => k % palms.length === i))));
  group.add(palmShadows(palmSpots, ground));
  const shore = scatter(track, 60, track.edge + 4, track.edge + 18, random).filter(dry).map((p) => ({ ...p, y: ground(p.x, p.z), rotY: random() * 6 }));
  group.add(instances(umbrella("#ff9f40", "#ffffff"), mat, shore.filter((_, i) => i % 4 === 0)));
  group.add(instances(umbrella("#3a86ff", "#ffffff"), mat, shore.filter((_, i) => i % 4 === 1)));
  group.add(instances(umbrella("#ff4d6d", "#ffe14d"), mat, shore.filter((_, i) => i % 4 === 3)));
  group.add(instances(beachBall(), mat, shore.filter((_, i) => i % 4 === 2)));
  const rocks = scatter(track, 30, track.edge + 25, track.edge + 90, random).map((p) => ({ ...p, y: ground(p.x, p.z) - 0.4, rotY: random() * 6, scale: 1 + random() * 2.5 }));
  group.add(instances(rock("#b8a98f"), mat, rocks));

  const lh = new THREE.Mesh(lighthouse(), mat);
  lh.position.set(coast - 28, -1, b.minZ + 20);
  const boat = new THREE.Mesh(sailboat(), mat);
  boat.position.set(coast - 90, -0.6, (b.minZ + b.maxZ) / 2 + 40);
  const boat2 = new THREE.Mesh(sailboat(), mat);
  boat2.position.set(coast - 160, -0.6, b.maxZ - 30);
  boat2.rotation.y = 2;
  group.add(lh, boat, boat2);

  const clouds = cloudLayer(random);
  group.add(clouds);
  return {
    group,
    update(time) {
      water.uniforms.time!.value = time;
      boat.position.y = -0.6 + Math.sin(time * 1.3) * 0.15;
      boat.rotation.z = Math.sin(time * 1.1) * 0.05;
      clouds.rotation.y = time * 0.004;
    },
  };
}

/** Puffy clouds far out round the map, turning ever so slowly. */
function cloudLayer(random: () => number): THREE.InstancedMesh {
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const mat = new THREE.MeshLambertMaterial({ color: "#ffffff", emissive: "#dfefff", emissiveIntensity: 0.5, fog: false });
  const spots = [];
  for (let i = 0; i < 26; i++) {
    const a = random() * Math.PI * 2;
    const r = 480 + random() * 200;
    const cx = Math.cos(a) * r;
    const cz = Math.sin(a) * r;
    const y = 90 + random() * 70;
    for (let k = 0; k < 5; k++) spots.push({ x: cx + (k - 2) * 14 + random() * 6, y: y + random() * 8, z: cz + random() * 10, scale: 10 + random() * 9 });
  }
  return instances(geo, mat, spots);
}

/**
 * Soft shadows cast by the palms, stretched away from the sun like the
 * cover's long afternoon shadows. One instanced decal, no shadow maps.
 */
function palmShadows(spots: readonly { x: number; z: number; scale?: number }[], ground: (x: number, z: number) => number): THREE.InstancedMesh {
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ map: softDot("rgba(110,80,35,0.55)", "rgba(110,80,35,0)"), transparent: true, depthWrite: false });
  // The sun sits up and to the left (see TrackScene), so shadows fall right and back.
  const away = Math.atan2(0.5, -0.35);
  const tall = new THREE.InstancedMesh(geo, mat, Math.max(1, spots.length));
  tall.count = spots.length;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), away);
  spots.forEach((spot, i) => {
    const k = spot.scale ?? 1;
    const x = spot.x + Math.sin(away) * 4.5 * k;
    const z = spot.z + Math.cos(away) * 4.5 * k;
    m.compose(new THREE.Vector3(x, ground(x, z) + 0.3, z), q, new THREE.Vector3(5 * k, 1, 11 * k));
    tall.setMatrixAt(i, m);
  });
  tall.instanceMatrix.needsUpdate = true;
  tall.computeBoundingSphere();
  tall.renderOrder = 1;
  return tall;
}
