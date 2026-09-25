import * as THREE from "three";
import { BARRIER, RAMP_LENGTH, TRAIN } from "../../engine/tuning";
import { MeshBuilder } from "../mesh-builder";
import { chevronTexture, glowTexture, painted, stripeTexture } from "../textures";
import { shadowPaint } from "./train";

const prefabs = new Map<string, THREE.Group>();
const materials = new Map<string, THREE.Material>();

function cached(key: string, build: () => THREE.Group): THREE.Group {
  let prefab = prefabs.get(key);
  if (!prefab) {
    prefab = build();
    prefab.userData.sharedGeometry = true;
    prefabs.set(key, prefab);
  }
  return prefab.clone();
}

/** Barriers light their own paint a little, so they read clearly against the dark at any speed. */
function mapped(key: string, texture: () => THREE.Texture, extra: THREE.MeshStandardMaterialParameters = {}): THREE.Material {
  let material = materials.get(key);
  if (!material) {
    const map = texture();
    material = new THREE.MeshStandardMaterial({ map, roughness: 0.5, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.55, ...extra });
    material.userData.shared = true;
    materials.set(key, material);
  }
  return material;
}

/** The colour pairs barriers come in. Low ones are always red and white, so they read as jump. */
const LOW_STRIPES = [["#ffffff", "#e8312a"], ["#ffffff", "#ff5a1f"]] as const;
const HIGH_STRIPES = [["#ffd21f", "#1d2029"], ["#ffffff", "#1f5fd6"]] as const;

/** A hurdle across the lane, front face at z = 0: jump it. */
export function lowBarrier(style: number): THREE.Group {
  return cached(`low-${style % 2}`, () => {
    const [a, c] = LOW_STRIPES[style % 2]!;
    const b = new MeshBuilder();
    const stripes = mapped(`low-${style % 2}`, () => stripeTexture(a, c, 7));
    const post = { color: 0xe9ecf1, finish: "satin" as const };
    for (const x of [-0.95, 0.95]) {
      b.box(0.14, BARRIER.lowTop, 0.14, post, [x, BARRIER.lowTop / 2, -0.17], undefined, 0.03);
      b.box(0.2, 0.08, 0.7, { color: 0x3a3f4b, finish: "satin" }, [x, 0.04, -0.17]);
      b.sphere(0.09, { color: 0xffa01f, finish: "glow" }, [x, BARRIER.lowTop + 0.05, -0.17]);
    }
    b.box(2.1, 0.42, 0.12, stripes, [0, BARRIER.lowTop - 0.26, -0.12], undefined, 0.02);
    b.box(2.0, 0.16, 0.1, stripes, [0, 0.36, -0.12], undefined, 0.02);
    // A tube of red light along the top: the line to clear.
    b.box(2.1, 0.07, 0.07, { color: 0xff2a3a, finish: "glow" }, [0, BARRIER.lowTop + 0.01, -0.12]);
    b.panel(2.6, 1.2, shadowPaint(), [0, 0.02, -0.17], [-Math.PI / 2, 0, 0]);
    b.panel(2.4, 1.4, floorGlow(0xff2a3a), [0, 0.025, -0.1], [-Math.PI / 2, 0, 0]);
    return b.build("low-barrier");
  });
}

/** A tall barrier with a gap underneath, front face at z = 0: roll under it. */
export function highBarrier(style: number): THREE.Group {
  return cached(`high-${style % 2}`, () => {
    const [a, c] = HIGH_STRIPES[style % 2]!;
    const b = new MeshBuilder();
    const stripes = mapped(`high-${style % 2}`, () => stripeTexture(a, c, 8));
    const sign = mapped("duck-sign", duckSign, { roughness: 0.4 });
    const frame = { color: 0x4a5160, finish: "metal" as const };
    for (const x of [-1.02, 1.02]) {
      b.box(0.14, BARRIER.highTop, 0.14, frame, [x, BARRIER.highTop / 2, -0.17], undefined, 0.03);
      b.box(0.24, 0.1, 0.9, { color: 0x2d323c, finish: "satin" }, [x, 0.05, -0.17]);
    }
    b.box(2.2, 0.72, 0.14, stripes, [0, BARRIER.highBottom + 0.38, -0.12], undefined, 0.03);
    b.box(2.1, 0.1, 0.12, frame, [0, BARRIER.highTop - 0.05, -0.17]);
    b.box(0.9, 0.8, 0.08, sign, [0, BARRIER.highTop - 0.55, -0.1], undefined, 0.02);
    for (const x of [-0.7, 0.7]) b.sphere(0.08, { color: 0xff3b30, finish: "glow" }, [x, BARRIER.highTop + 0.04, -0.17]);
    // A tube of yellow light along the bottom of the board: the edge to get under.
    b.box(2.2, 0.07, 0.07, { color: 0xffd21f, finish: "glow" }, [0, BARRIER.highBottom, -0.06]);
    for (const x of [-1.02, 1.02]) b.box(0.05, BARRIER.highTop - 0.1, 0.05, { color: 0xffd21f, finish: "glow" }, [x, BARRIER.highTop / 2, -0.08]);
    b.panel(2.6, 1.2, shadowPaint(), [0, 0.02, -0.17], [-Math.PI / 2, 0, 0]);
    b.panel(2.4, 1.4, floorGlow(0xffd21f), [0, 0.025, -0.1], [-Math.PI / 2, 0, 0]);
    return b.build("high-barrier");
  });
}

/** The light a barrier's tube casts on the wet ground in front of it. */
function floorGlow(color: number): THREE.Material {
  let material = materials.get(`floor-${color}`);
  if (!material) {
    material = new THREE.MeshBasicMaterial({ map: glowTexture(), color, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    material.userData.shared = true;
    materials.set(`floor-${color}`, material);
  }
  return material;
}

/** The sign on a high barrier: a blue disc with an arrow down. */
function duckSign(): THREE.Texture {
  return painted("duck-sign", 128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#1f5fd6";
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.44, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(w * 0.42, h * 0.2);
    ctx.lineTo(w * 0.58, h * 0.2);
    ctx.lineTo(w * 0.58, h * 0.5);
    ctx.lineTo(w * 0.74, h * 0.5);
    ctx.lineTo(w * 0.5, h * 0.8);
    ctx.lineTo(w * 0.26, h * 0.5);
    ctx.lineTo(w * 0.42, h * 0.5);
    ctx.fill();
  });
}

/** A steel ramp up onto a train roof, foot at z = 0, top at z = -7. */
export function ramp(): THREE.Group {
  return cached("ramp", () => {
    const b = new MeshBuilder();
    const deck = mapped("ramp-deck", chevronTexture, { roughness: 0.6, metalness: 0.3 });
    const slope = Math.atan2(TRAIN.height, RAMP_LENGTH);
    const length = Math.hypot(TRAIN.height, RAMP_LENGTH);
    const yellow = { color: 0xffc21a, finish: "glow" as const };
    b.panel(2.0, length, deck, [0, TRAIN.height / 2 + 0.02, -RAMP_LENGTH / 2], [-Math.PI / 2 + slope, 0, 0]);
    b.box(2.0, 0.12, length, { color: 0x3a3f4b, finish: "metal" }, [0, TRAIN.height / 2 - 0.05, -RAMP_LENGTH / 2], [slope, 0, 0]);
    for (const x of [-1.05, 1.05]) {
      b.box(0.14, 0.3, length, yellow, [x, TRAIN.height / 2 + 0.12, -RAMP_LENGTH / 2], [slope, 0, 0]);
      for (let i = 1; i <= 3; i++) {
        const z = (-RAMP_LENGTH * i) / 4;
        const y = (TRAIN.height * i) / 4;
        b.box(0.12, y, 0.12, { color: 0x6b7280, finish: "metal" }, [x, y / 2, z]);
      }
    }
    b.panel(2.8, RAMP_LENGTH + 1, shadowPaint(), [0, 0.02, -RAMP_LENGTH / 2], [-Math.PI / 2, 0, 0]);
    return b.build("ramp");
  });
}
