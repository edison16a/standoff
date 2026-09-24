import * as THREE from "three";
import type { PowerKind } from "../../engine/types";
import { DISPLAY_FONT } from "../art/graffiti";
import { MeshBuilder } from "../mesh-builder";
import { glowTexture, painted } from "../textures";

/** A coin with a raised rim, standing on edge and facing the runner. */
export function coinGeometry(): THREE.BufferGeometry {
  const r = 0.38;
  const t = 0.05;
  const profile = [
    [0, t * 0.6],
    [r * 0.62, t * 0.6],
    [r * 0.7, t],
    [r * 0.95, t],
    [r, t * 0.4],
    [r, -t * 0.4],
    [r * 0.95, -t],
    [r * 0.7, -t],
    [r * 0.62, -t * 0.6],
    [0, -t * 0.6],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const geometry = new THREE.LatheGeometry(profile, 28);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

let coinMat: THREE.MeshStandardMaterial | null = null;

export function coinMaterial(): THREE.MeshStandardMaterial {
  coinMat ??= new THREE.MeshStandardMaterial({ color: 0xffc629, metalness: 0.85, roughness: 0.22, emissive: 0x6b4300, emissiveIntensity: 0.9 });
  coinMat.userData.shared = true;
  return coinMat;
}

export const POWER_COLORS: Record<PowerKind, number> = {
  boots: 0x3ddc84,
  hoverboard: 0x4db8ff,
  magnet: 0xff4d5e,
  double: 0xffd21f,
  jetpack: 0xff8a1f,
};

const prefabs = new Map<PowerKind, THREE.Group>();

/** A power up as it floats over the track: its object, a glowing halo and a ring under it. */
export function pickupModel(kind: PowerKind): THREE.Group {
  let prefab = prefabs.get(kind);
  if (!prefab) {
    prefab = buildPickup(kind);
    prefab.userData.sharedGeometry = true;
    prefabs.set(kind, prefab);
  }
  return prefab.clone();
}

function buildPickup(kind: PowerKind): THREE.Group {
  const b = new MeshBuilder();
  const tint = POWER_COLORS[kind];
  switch (kind) {
    case "boots":
      sneaker(b, 0x3ddc84, -0.14);
      sneaker(b, 0x3ddc84, 0.14);
      break;
    case "hoverboard":
      hoverboard(b, 0x4db8ff, 0xff4db8);
      break;
    case "magnet":
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI * (i / 8);
        b.box(0.16, 0.16, 0.2, { color: 0xe8312a, finish: "gloss" }, [Math.cos(a) * 0.26, -Math.sin(a) * 0.26, 0], [0, 0, -a]);
      }
      for (const x of [-0.26, 0.26]) {
        b.box(0.17, 0.2, 0.21, { color: 0xe8312a, finish: "gloss" }, [x, 0.1, 0]);
        b.box(0.17, 0.14, 0.21, { color: 0xdfe4ea, finish: "metal" }, [x, 0.27, 0]);
      }
      break;
    case "double": {
      const badge = new THREE.MeshStandardMaterial({ map: twoTimes(), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.4, emissive: 0x332200 });
      badge.userData.shared = true;
      b.panel(0.9, 0.9, badge, [0, 0, 0]);
      break;
    }
    case "jetpack":
      for (const x of [-0.14, 0.14]) {
        b.capsule(0.12, 0.32, { color: 0xff8a1f, finish: "gloss" }, [x, 0, 0]);
        b.post(0.08, 0.1, { color: 0x3a3f4b, finish: "metal" }, [x, -0.3, 0], 10, 0.11);
        b.sphere(0.07, { color: 0xffe14d, finish: "glow" }, [x, -0.38, 0], [1, 1.6, 1]);
      }
      b.box(0.16, 0.34, 0.14, { color: 0x3a3f4b, finish: "satin" }, [0, 0.02, -0.08], undefined, 0.04);
      break;
  }
  const group = b.build(`pickup-${kind}`);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: tint, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 }));
  halo.scale.setScalar(1.9);
  halo.material.userData.shared = true;
  group.add(halo);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.04, 8, 36), new THREE.MeshBasicMaterial({ color: tint, toneMapped: false }));
  ring.material.userData.shared = true;
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.55;
  ring.name = "ring";
  group.add(ring);
  return group;
}

/** A chunky sneaker, toe toward -z. Also used for the runners' own shoes. */
export function sneaker(b: MeshBuilder, upper: number, x: number, y = 0, z = 0, sole = 0xffffff): void {
  b.box(0.2, 0.08, 0.36, { color: sole, finish: "satin" }, [x, y - 0.1, z - 0.02], undefined, 0.035);
  b.box(0.18, 0.14, 0.3, { color: upper, finish: "satin" }, [x, y, z], undefined, 0.06);
  b.box(0.16, 0.1, 0.12, { color: upper, finish: "satin" }, [x, y + 0.08, z + 0.07], undefined, 0.04);
  b.box(0.1, 0.02, 0.14, { color: 0xffffff, finish: "matte" }, [x, y + 0.075, z - 0.08]);
}

/** A hoverboard, nose toward -z. */
export function hoverboard(b: MeshBuilder, deck: number, trim: number): void {
  b.box(0.5, 0.06, 1.3, { color: deck, finish: "gloss" }, [0, 0, 0], undefined, 0.03);
  b.box(0.36, 0.02, 1.1, { color: trim, finish: "gloss" }, [0, 0.04, 0], undefined, 0.01);
  b.box(0.3, 0.05, 0.3, { color: 0x2a2d35, finish: "satin" }, [0, -0.05, 0.36], undefined, 0.02);
  b.box(0.3, 0.05, 0.3, { color: 0x2a2d35, finish: "satin" }, [0, -0.05, -0.36], undefined, 0.02);
  for (const z of [-0.36, 0.36]) b.tube(0.08, 0.02, { color: 0x7ff3ff, finish: "glow" }, [0, -0.085, z], 14, 0.08, [0, 0, 0]);
}

function twoTimes(): THREE.Texture {
  return painted("two-times", 128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#ffd21f";
    ctx.strokeStyle = "#8a4b00";
    ctx.lineWidth = 8;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? w * 0.47 : w * 0.3;
      ctx.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.fillStyle = "#8a2b00";
    ctx.font = `900 ${h * 0.34}px ${DISPLAY_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("2X", w / 2, h * 0.54);
  });
}
