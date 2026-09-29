import * as THREE from "three";
import { seededRandom } from "../random";
import { disposeGeometries, shadowAll, trophyMaterials } from "./materials";
import { band, merged, sweep, turned } from "./shapes";
import type { Trophy, TrophyOptions } from "./trophy";

/** True to the real piece: about 0.37 tall, the globe about 0.11 across. */
const BASE_TOP = 0.078;
const GLOBE_Y = 0.305;
const GLOBE = 0.056;
const NATURAL_HEIGHT = GLOBE_Y + GLOBE;

/**
 * A football world trophy in the classic style: two gold figures
 * spiralling up out of the base, arms raised to hold the globe, over a
 * gold foot ringed with two green stone bands.
 */
export function createWorldTrophy(options: TrophyOptions = {}): Trophy {
  const materials = options.materials ?? trophyMaterials();
  const owned = !options.materials;
  const group = new THREE.Group();
  const scale = (options.height ?? NATURAL_HEIGHT) / NATURAL_HEIGHT;
  const root = new THREE.Group();
  root.scale.setScalar(scale);
  group.add(root);

  root.add(new THREE.Mesh(turned([[0.064, 0], [0.066, 0.006], [0.064, 0.012], [0.062, 0.07], [0.058, BASE_TOP - 0.004], [0.05, BASE_TOP]]), materials.gold));
  // The two green bands sit proud of the foot, with thin gold lips either side.
  for (const y of [0.022, 0.05]) {
    root.add(new THREE.Mesh(turned([[0.0655, y - 0.0085], [0.0662, y], [0.0655, y + 0.0085]], 72), materials.malachite));
    root.add(new THREE.Mesh(merged([band(0.0652, 0.0016, y - 0.0095), band(0.0652, 0.0016, y + 0.0095)]), materials.satinGold));
  }

  // The body of the sculpture: it narrows at the waist and opens up under the globe.
  const core = turned([[0.05, BASE_TOP], [0.042, 0.11], [0.03, 0.16], [0.027, 0.19], [0.034, 0.225], [0.042, 0.255], [0.03, 0.27]], 48);
  root.add(new THREE.Mesh(core, materials.satinGold));
  root.add(new THREE.Mesh(figures(), materials.gold));

  const globe = new THREE.Mesh(new THREE.SphereGeometry(GLOBE, 64, 40), globeMaterial(materials.gold));
  globe.position.y = GLOBE_Y;
  globe.rotation.set(0.4, 0.8, 0);
  root.add(globe);

  shadowAll(group);
  return {
    group,
    grip: new THREE.Vector3(0, 0.2 * scale, 0),
    height: NATURAL_HEIGHT * scale,
    dispose() {
      disposeGeometries(group);
      (globe.material as THREE.MeshPhysicalMaterial).roughnessMap?.dispose();
      (globe.material as THREE.MeshPhysicalMaterial).bumpMap?.dispose();
      (globe.material as THREE.Material).dispose();
      if (owned) materials.dispose();
    },
  };
}

/** Two figures, half a turn apart, each a body twisting up with both arms raised round the globe. */
function figures(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const start of [0, Math.PI]) {
    const at = (a: number, r: number, y: number) => new THREE.Vector3(Math.cos(start + a) * r, y, Math.sin(start + a) * r);
    // The body rises from the base, twisting a third of a turn, thick at the legs and the chest.
    const body = new THREE.CatmullRomCurve3([at(0, 0.046, BASE_TOP), at(0.5, 0.045, 0.13), at(1.0, 0.037, 0.19), at(1.4, 0.045, 0.235), at(1.6, 0.05, 0.255)]);
    parts.push(sweep(body, (t) => 0.019 - 0.007 * Math.sin(Math.PI * t * 0.9) + 0.004 * t, 48, 14));
    // The head, bowed out from the chest.
    const head = new THREE.SphereGeometry(0.012, 20, 14);
    const top = at(1.72, 0.064, 0.262);
    head.translate(top.x, top.y, top.z);
    parts.push(head);
    // Two arms reach up and round the globe, palms flat on it.
    for (const reach of [-0.55, 0.75]) {
      const arm = new THREE.CatmullRomCurve3([at(1.55, 0.048, 0.252), at(1.55 + reach * 0.5, 0.062, 0.275), at(1.55 + reach, GLOBE * 0.98, GLOBE_Y - 0.004), at(1.55 + reach * 1.25, GLOBE * 0.9, GLOBE_Y + 0.02)]);
      parts.push(sweep(arm, (t) => 0.0085 - 0.003 * t, 32, 10));
    }
  }
  return merged(parts);
}

/** Polished gold oceans and satin continents, raised a little. A plain gold globe away from a browser. */
function globeMaterial(gold: THREE.MeshPhysicalMaterial): THREE.MeshPhysicalMaterial {
  const material = gold.clone();
  if (typeof document === "undefined") return material;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return material;
  ctx.fillStyle = "#222";
  ctx.fillRect(0, 0, 512, 256);
  const r = seededRandom(19);
  ctx.fillStyle = "#bbb";
  // Land masses as clusters of soft blobs, kept away from the poles where the map stretches.
  for (let c = 0; c < 7; c++) {
    const cx = r() * 512;
    const cy = 60 + r() * 136;
    for (let b = 0; b < 16; b++) {
      ctx.beginPath();
      ctx.ellipse(cx + (r() - 0.5) * 90, cy + (r() - 0.5) * 60, 8 + r() * 22, 6 + r() * 16, r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  material.roughnessMap = texture;
  material.roughness = 1;
  material.bumpMap = texture;
  material.bumpScale = 1.5;
  return material;
}
