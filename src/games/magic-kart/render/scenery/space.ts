import * as THREE from "three";
import type { Track } from "../../engine/track";
import { box, cyl, merge, paint, ring } from "../models/geo";
import { softDot } from "../textures";
import { sweep } from "../track/sweep";
import { instances } from "./instances";
import type { Scenery } from "./scenery";
import { seeded, trackBounds } from "./terrain";

/** A gas giant's stripes, painted on a canvas and wrapped round a sphere. */
function bandTexture(colors: string[]): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    let y = 0;
    let i = 0;
    while (y < 256) {
      const h = 10 + ((i * 37) % 30);
      ctx.fillStyle = colors[i % colors.length]!;
      ctx.fillRect(0, y, 16, h);
      y += h;
      i++;
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function planet(radius: number, colors: string[], ringed: boolean): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ map: bandTexture(colors), fog: false, emissive: colors[0], emissiveIntensity: 0.15 });
  g.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), mat));
  if (ringed) {
    const r = new THREE.Mesh(new THREE.RingGeometry(radius * 1.35, radius * 2.1, 64), new THREE.MeshBasicMaterial({ color: "#e8c9ff", transparent: true, opacity: 0.45, side: THREE.DoubleSide, fog: false }));
    r.rotation.x = Math.PI / 2 - 0.35;
    g.add(r);
  }
  return g;
}

/**
 * Star Ring: the road floats in deep space. Glowing rails run along both
 * edges so the road reads against the dark, portal rings arch over it,
 * and around it drift planets, a space station, nebula glow and a slowly
 * turning belt of asteroids.
 */
export function buildSpace(track: Track): Scenery {
  const group = new THREE.Group();
  const random = seeded(3);
  const b = trackBounds(track);
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;

  const edgeGlow = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: THREE.DoubleSide });
  const rail = sweep(track, [{ d: track.edge + 0.05, y: 0.02 }, { d: track.edge + 0.05, y: 0.35 }], {
    bothSides: true,
    step: 2,
    skip: (s) => track.inGap(s),
    color: (s) => (Math.floor(s / 10) % 2 === 0 ? "#3fe8ff" : "#ff4fd8"),
  });
  group.add(new THREE.Mesh(rail, edgeGlow));

  // Portal rings over the road, one instanced mesh, each ring cycling through the rainbow.
  const ringSpots: number[] = [];
  for (let s = 60; s < track.length - 40; s += 95) if (!track.inGap(s) && track.rampHeight(s) <= 0) ringSpots.push(s);
  const rings = new THREE.InstancedMesh(new THREE.TorusGeometry(track.edge + 3, 0.22, 8, 64, Math.PI), new THREE.MeshBasicMaterial({ toneMapped: false }), Math.max(1, ringSpots.length));
  rings.count = ringSpots.length;
  const pose = new THREE.Object3D();
  ringSpots.forEach((s, i) => {
    const f = track.frameAt(s);
    pose.position.set(f.x, f.y, f.z);
    pose.rotation.y = Math.atan2(f.tx, f.tz);
    pose.updateMatrix();
    rings.setMatrixAt(i, pose.matrix);
    rings.setColorAt(i, new THREE.Color("#8f7dff"));
  });
  rings.computeBoundingSphere();
  group.add(rings);
  const hue = new THREE.Color();

  const giant = planet(120, ["#ff9d5c", "#ffcf8a", "#e0703a", "#ffe2b0"], true);
  giant.position.set(cx - 520, 160, cz - 380);
  const moon = planet(40, ["#8fb8ff", "#cfe0ff", "#6a8fe0"], false);
  moon.position.set(cx + 420, 90, cz + 300);
  const small = planet(22, ["#c77dff", "#ff7df2"], false);
  small.position.set(cx + 250, -60, cz - 420);
  group.add(giant, moon, small);

  const station = new THREE.Mesh(
    merge([
      paint(ring(30, 3, 48, 10), "#cfd6e6", { rot: [Math.PI / 2, 0, 0] }),
      paint(cyl(4, 4, 30, 16), "#9aa6c0"),
      paint(box(70, 1, 8), "#3a5bd7"),
      paint(cyl(6, 6, 4, 16), "#e8eefc", { at: [0, 16, 0] }),
    ]),
    new THREE.MeshLambertMaterial({ vertexColors: true, fog: false }),
  );
  station.position.set(cx + 60, 120, cz + 480);
  group.add(station);

  const rockGeo = new THREE.DodecahedronGeometry(1, 1);
  const rockMat = new THREE.MeshLambertMaterial({ color: "#6d6378" });
  const belt = new THREE.Group();
  const spots = [];
  for (let i = 0; i < 220; i++) {
    const a = random() * Math.PI * 2;
    const r = 330 + random() * 160;
    spots.push({ x: Math.cos(a) * r, y: -30 + random() * 70, z: Math.sin(a) * r, rotY: random() * 6, scale: 2 + random() * 9 });
  }
  belt.add(instances(rockGeo, rockMat, spots));
  // A few rocks float right under the road too, so the drop below has depth.
  const under = [];
  for (let i = 0; i < 70; i++) {
    const s = random() * track.length;
    const f = track.frameAt(s);
    under.push({ x: f.x + (random() - 0.5) * 120, y: f.y - 25 - random() * 60, z: f.z + (random() - 0.5) * 120, rotY: random() * 6, scale: 2 + random() * 6 });
  }
  group.add(instances(rockGeo, rockMat, under));
  belt.position.set(cx, 0, cz);
  group.add(belt);

  const nebulaMat = new THREE.SpriteMaterial({ map: softDot("rgba(255,255,255,0.55)", "rgba(255,255,255,0)"), blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  for (const [x, y, z, size, color] of [
    [cx - 300, 60, cz + 500, 500, "#7a3cff"],
    [cx + 520, 20, cz - 200, 420, "#ff3fb4"],
    [cx - 100, -200, cz - 500, 600, "#2f6bff"],
    [cx + 200, 250, cz + 100, 380, "#3fe8ff"],
  ] as const) {
    const sprite = new THREE.Sprite(nebulaMat.clone());
    sprite.material.color.set(color);
    sprite.material.opacity = 0.35;
    sprite.position.set(x, y, z);
    sprite.scale.setScalar(size);
    group.add(sprite);
  }

  return {
    group,
    update(time) {
      belt.rotation.y = time * 0.01;
      giant.rotation.y = time * 0.02;
      station.rotation.y = time * 0.05;
      for (let i = 0; i < rings.count; i++) rings.setColorAt(i, hue.setHSL((time * 0.05 + i * 0.13) % 1, 0.9, 0.62));
      if (rings.instanceColor) rings.instanceColor.needsUpdate = true;
    },
  };
}
