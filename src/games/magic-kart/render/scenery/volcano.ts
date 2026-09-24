import * as THREE from "three";
import type { Track } from "../../engine/track";
import { lathe, merge, paint } from "../models/geo";
import { softDot } from "../textures";
import { rock } from "./beach-props";
import { instances, propMaterial } from "./instances";
import { liquidMaterial, liquidSheet } from "./liquid";
import type { Scenery } from "./scenery";
import { buildTerrain, scatter, seeded, trackBounds } from "./terrain";

const ROCK = new THREE.Color("#3b302d");
const ASH = new THREE.Color("#5c4a42");
const SCORCH = new THREE.Color("#7a3a22");
const LAVA_LEVEL = -2.5;

function smooth(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Magma Peak: dark rock and ash with rivers of lava winding through, the
 * road built up on a ridge as it climbs, a smoking volcano with a glowing
 * crater behind, glowing crystals and embers drifting up everywhere.
 */
export function buildVolcano(track: Track): Scenery {
  const group = new THREE.Group();
  const random = seeded(5);
  const b = trackBounds(track);
  const peak = new THREE.Vector3(b.maxX + 150, 0, (b.minZ + b.maxZ) / 2 + 40);
  const gaps = track.gaps.map((gap) => ({ at: track.pointAt((gap.start + gap.end) / 2, 0), frame: track.frameAt(gap.start) }));

  const terrain = buildTerrain(track, {
    margin: 200,
    cell: 5,
    height(x, z, near) {
      const off = Math.max(0, near.dist - track.edge);
      // The road sits on an embankment that falls away down to the plain.
      const bank = near.y - 0.12 - Math.max(0, off - 2) * 0.55;
      const plain = Math.sin(x * 0.04) * Math.cos(z * 0.05) * 2 + Math.sin(x * 0.11 + z * 0.07) * 0.8;
      const cone = Math.max(0, 70 - Math.hypot(x - peak.x, z - peak.z) * 0.5);
      let h = Math.max(bank, plain, cone);
      // A lava river winding across the plain.
      const river = Math.abs(z - (b.minZ + b.maxZ) / 2 - Math.sin(x * 0.02) * 60) - 8;
      if (off > 8) h = Math.min(h, LAVA_LEVEL - 1 + smooth(0, 10, river) * 30);
      for (const gap of gaps) {
        const along = (x - gap.at.x) * gap.frame.tx + (z - gap.at.z) * gap.frame.tz;
        if (Math.abs(along) < 7) h = Math.min(h, LAVA_LEVEL - 2);
      }
      // The open, wall-less stretch drops straight into a lava pool.
      if (near.d > track.edge && !track.hasWall(near.s, 1)) h = Math.min(h, LAVA_LEVEL - 2);
      return h;
    },
    color(x, z, h, near, out) {
      out.copy(ROCK).lerp(ASH, smooth(-1, 8, h) * 0.6);
      if (h < 0.5) out.lerp(SCORCH, smooth(0.5, LAVA_LEVEL, h));
      out.offsetHSL(0, 0, Math.sin(x * 0.23) * Math.cos(z * 0.19) * 0.03);
    },
  });
  group.add(terrain);

  const lava = liquidMaterial({ shallow: "#ff7a1a", deep: "#b3200a", crest: "#ffe36a", glow: true, scale: 9 });
  group.add(liquidSheet(lava, 1400, 1400, (b.minX + b.maxX) / 2, LAVA_LEVEL, (b.minZ + b.maxZ) / 2));

  const volcano = new THREE.Mesh(
    merge([paint(lathe([[150, 0], [120, 20], [70, 58], [26, 90], [18, 86], [0, 80]], 40), "#2e2422")]),
    new THREE.MeshLambertMaterial({ vertexColors: true }),
  );
  volcano.position.copy(peak);
  const crater = new THREE.Mesh(new THREE.CircleGeometry(19, 32).rotateX(-Math.PI / 2), lava);
  crater.position.set(peak.x, 86, peak.z);
  group.add(volcano, crater);

  const mat = propMaterial();
  const spires = scatter(track, 70, track.edge + 6, track.edge + 70, random).map((p) => ({ ...p, y: p.y - 1, rotY: random() * 6, scale: 1.2 + random() * 2.5 }));
  const spire = merge([paint(lathe([[1.4, 0], [1.1, 3], [0.6, 6], [0.001, 8]], 7), "#2b2224")]);
  group.add(instances(spire, mat, spires));
  group.add(instances(rock("#3f3330"), mat, scatter(track, 60, track.edge + 4, track.edge + 40, random).map((p) => ({ ...p, y: p.y - 0.8, rotY: random() * 6, scale: 0.8 + random() * 1.6 }))));
  const crystal = new THREE.OctahedronGeometry(0.8, 0).scale(0.6, 1.8, 0.6).translate(0, 1.2, 0);
  const crystals = scatter(track, 50, track.edge + 3, track.edge + 25, random).map((p) => ({ ...p, y: p.y - 0.3, rotY: random() * 6, scale: 0.8 + random() * 1.2 }));
  group.add(instances(crystal, new THREE.MeshBasicMaterial({ color: "#ff8a2a", toneMapped: false }), crystals));

  // Embers rising from the lava and a plume from the crater, as slow drifting sprites.
  const emberMat = new THREE.SpriteMaterial({ map: softDot("rgba(255,200,120,1)", "rgba(255,90,20,0)"), blending: THREE.AdditiveBlending, depthWrite: false });
  const embers: THREE.Sprite[] = [];
  for (let i = 0; i < 90; i++) {
    const e = new THREE.Sprite(emberMat);
    const s = random() * track.length;
    const f = track.frameAt(s);
    e.userData = { x: f.x + (random() - 0.5) * 140, z: f.z + (random() - 0.5) * 140, base: f.y - 2, speed: 1 + random() * 3, phase: random() * 40 };
    e.scale.setScalar(0.5 + random() * 0.6);
    embers.push(e);
    group.add(e);
  }
  const smokeMat = new THREE.SpriteMaterial({ map: softDot("rgba(60,50,50,0.7)", "rgba(60,50,50,0)"), depthWrite: false, fog: false });
  const plume: THREE.Sprite[] = [];
  for (let i = 0; i < 14; i++) {
    const puff = new THREE.Sprite(smokeMat.clone());
    plume.push(puff);
    group.add(puff);
  }

  return {
    group,
    update(time) {
      lava.uniforms.time!.value = time;
      for (const e of embers) {
        const u = e.userData as { x: number; z: number; base: number; speed: number; phase: number };
        const t = (time * u.speed + u.phase) % 40;
        e.position.set(u.x + Math.sin(t * 0.5) * 2, u.base + t, u.z);
      }
      plume.forEach((puff, i) => {
        const t = (time * 0.08 + i / plume.length) % 1;
        puff.position.set(peak.x + Math.sin(i * 1.7) * 10 * t, 92 + t * 140, peak.z + t * 60);
        puff.scale.setScalar(20 + t * 90);
        puff.material.opacity = 1 - t;
      });
    },
  };
}
