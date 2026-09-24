import * as THREE from "three";
import type { Track } from "../../engine/track";
import { box, cyl, merge, paint } from "../models/geo";
import { instances, propMaterial } from "./instances";
import type { Scenery } from "./scenery";
import { coarseSamples, nearest, seeded, trackBounds } from "./terrain";

const NEON = ["#ff3fb4", "#1fe0ff", "#b04bff", "#ffd23f", "#39ff9a"];

/** Lit windows on a dark facade: most warm, a few coloured, some dark. */
function windowTexture(random: () => number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#07070f";
    ctx.fillRect(0, 0, 128, 256);
    for (let y = 4; y < 256; y += 12) {
      for (let x = 4; x < 128; x += 10) {
        const r = random();
        if (r < 0.45) continue;
        ctx.fillStyle = r < 0.8 ? "#ffd9a0" : r < 0.9 ? "#9fe8ff" : "#ff9ae0";
        ctx.globalAlpha = 0.5 + random() * 0.5;
        ctx.fillRect(x, y, 6, 7);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A text sign for a billboard, in neon on black. */
function signTexture(text: string, color: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#0b0b18";
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);
    ctx.font = "bold 76px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = color;
    ctx.fillText(text, 256, 68);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Neo City at night: dark streets, towers full of lit windows, neon
 * strips on the rooftops, glowing billboards, street lamps down both
 * sides of the road and hover cars drifting between the towers.
 */
export function buildCity(track: Track): Scenery {
  const group = new THREE.Group();
  const random = seeded(11);
  const b = trackBounds(track);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: "#1c1c28" }));
  ground.position.set((b.minX + b.maxX) / 2, -0.06, (b.minZ + b.maxZ) / 2);
  group.add(ground);

  const samples = coarseSamples(track, 4);
  const towers: { x: number; z: number; w: number; d: number; h: number }[] = [];
  for (let x = b.minX - 160; x < b.maxX + 160; x += 26) {
    for (let z = b.minZ - 160; z < b.maxZ + 160; z += 26) {
      const px = x + (random() - 0.5) * 8;
      const pz = z + (random() - 0.5) * 8;
      const near = nearest(samples, px, pz);
      if (near.dist < track.edge + 14) continue;
      const w = 12 + random() * 10;
      const d = 12 + random() * 10;
      // Towers grow taller away from the road, so the road stays open to the sky.
      const h = 14 + random() * 26 + Math.min(70, (near.dist - 20) * 0.5) * random();
      towers.push({ x: px, z: pz, w, d, h });
    }
  }
  const facade = new THREE.MeshLambertMaterial({ map: windowTexture(random), emissiveMap: windowTexture(random), emissive: "#ffffff", emissiveIntensity: 1.1, color: "#4a4a66" });
  const unit = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const mesh = new THREE.InstancedMesh(unit, facade, towers.length);
  const m = new THREE.Matrix4();
  towers.forEach((t, i) => mesh.setMatrixAt(i, m.compose(new THREE.Vector3(t.x, 0, t.z), new THREE.Quaternion(), new THREE.Vector3(t.w, t.h, t.d))));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  group.add(mesh);

  // A neon band round the top of every third tower.
  const bandGeo = new THREE.BoxGeometry(1.02, 0.6, 1.02);
  const bandMat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const bandTowers = towers.filter((_, i) => i % 3 === 0);
  const bands = new THREE.InstancedMesh(bandGeo, bandMat, Math.max(1, bandTowers.length));
  const tint = new THREE.Color();
  bandTowers.forEach((t, i) => {
    bands.setMatrixAt(i, m.compose(new THREE.Vector3(t.x, t.h - 1.2, t.z), new THREE.Quaternion(), new THREE.Vector3(t.w, 1, t.d)));
    bands.setColorAt(i, tint.set(NEON[i % NEON.length]!));
  });
  bands.count = bandTowers.length;
  bands.computeBoundingSphere();
  group.add(bands);

  const lamp = merge([
    paint(cyl(0.12, 0.16, 7, 8), "#3a3c4e", { at: [0, 3.5, 0] }),
    paint(box(2.2, 0.18, 0.3, 0.05), "#3a3c4e", { at: [-1, 7, 0] }),
  ]);
  const lampSpots = [];
  const headSpots = [];
  for (let s = 0; s < track.length; s += 28) {
    const f = track.frameAt(s);
    for (const side of [-1, 1]) {
      const d = side * (track.edge + 1.6);
      const x = f.x + f.rx * d;
      const z = f.z + f.rz * d;
      const rotY = Math.atan2(f.rx * side, f.rz * side) + Math.PI / 2;
      lampSpots.push({ x, y: 0, z, rotY });
      headSpots.push({ x: x - f.rx * side * 2, y: 6.85, z: z - f.rz * side * 2 });
    }
  }
  group.add(instances(lamp, propMaterial(), lampSpots));
  group.add(instances(new THREE.BoxGeometry(0.9, 0.12, 0.5), new THREE.MeshBasicMaterial({ color: "#fff1c4", toneMapped: false }), headSpots));

  for (const [i, text] of ["NEO CITY", "MAGIC KART", "TURBO", "GO GO GO"].entries()) {
    const s = track.length * (0.12 + i * 0.24);
    const f = track.frameAt(s);
    const side = i % 2 ? 1 : -1;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), new THREE.MeshBasicMaterial({ map: signTexture(text, NEON[i]!), toneMapped: false, side: THREE.DoubleSide }));
    sign.position.set(f.x + f.rx * side * (track.edge + 6), 9, f.z + f.rz * side * (track.edge + 6));
    sign.rotation.y = Math.atan2(-f.tx, -f.tz) - side * 0.5;
    group.add(sign);
  }

  // Hover cars circling between the towers, all in one instanced mesh.
  const carGeo = merge([paint(box(3, 0.8, 1.4, 0.3), "#e0e4f0"), paint(box(1.4, 0.5, 1.2, 0.2), "#1fe0ff", { at: [0.2, 0.55, 0] })]);
  const flights = Array.from({ length: 14 }, () => ({ r: 120 + random() * 220, h: 30 + random() * 50, speed: (random() < 0.5 ? -1 : 1) * (0.05 + random() * 0.08), phase: random() * 6 }));
  const cars = new THREE.InstancedMesh(carGeo, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), flights.length);
  cars.frustumCulled = false;
  const centre = new THREE.Vector3((b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2);
  const pose = new THREE.Object3D();
  group.add(cars);

  return {
    group,
    update(time) {
      flights.forEach((u, i) => {
        const a = u.phase + time * u.speed;
        pose.position.set(centre.x + Math.cos(a) * u.r, u.h, centre.z + Math.sin(a) * u.r);
        pose.rotation.y = -a + (u.speed > 0 ? 0 : Math.PI);
        pose.updateMatrix();
        cars.setMatrixAt(i, pose.matrix);
      });
      cars.instanceMatrix.needsUpdate = true;
    },
  };
}
