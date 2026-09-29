import * as THREE from "three";
import type { PowerKind } from "../../engine/types";
import { DISPLAY_FONT } from "../art/graffiti";
import { MeshBuilder } from "../mesh-builder";
import { prefab } from "../prefabs";
import { glowTexture, painted } from "../textures";
import { toon } from "../toon";

/** A coin with a raised rim and a star struck in the middle, standing on edge and facing the runner. */
export function coinGeometry(grow = 0): THREE.BufferGeometry {
  const r = 0.38 + grow;
  const t = 0.06 + grow;
  // Traced from the bottom face up, so the faces point outward and the ink hull shows only round the rim.
  const profile = [
    [0, -t * 0.75],
    [r * 0.62, -t * 0.55],
    [r * 0.7, -t],
    [r * 0.95, -t],
    [r, -t * 0.4],
    [r, t * 0.4],
    [r * 0.95, t],
    [r * 0.7, t],
    [r * 0.62, t * 0.55],
    [0, t * 0.75],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const geometry = new THREE.LatheGeometry(profile, 24);
  geometry.rotateX(Math.PI / 2);
  // The face picture is laid straight on from the front, so the rim takes the edge of the picture.
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const uv = geometry.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / (2 * r), 0.5 + pos.getY(i) / (2 * r));
  return geometry;
}

let coinMat: THREE.MeshToonMaterial | null = null;

export function coinMaterial(): THREE.MeshToonMaterial {
  // A warm glow of its own keeps the shaded side gold rather than brown.
  coinMat ??= toon({ map: coinFace(), emissive: 0x6a4200, emissiveIntensity: 0.8 });
  coinMat.userData.shared = true;
  return coinMat;
}

/** A gold coin face: a dark rim, a bright face with a raised star and a shine across it. */
function coinFace(): THREE.Texture {
  return painted("coin-face", 128, 128, (ctx, w, h) => {
    const c = w / 2;
    ctx.fillStyle = "#d98f00";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ffc21a";
    ctx.beginPath();
    ctx.arc(c, c, w * 0.46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd84a";
    ctx.beginPath();
    ctx.arc(c, c, w * 0.34, 0, Math.PI * 2);
    ctx.fill();
    const starAt = (dx: number, dy: number, fill: string) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? w * 0.22 : w * 0.1;
        ctx.lineTo(c + dx + Math.cos(a) * r, c + dy + Math.sin(a) * r);
      }
      ctx.fill();
    };
    starAt(3, 3, "#d98f00");
    starAt(0, 0, "#fff3b0");
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.ellipse(c - w * 0.18, c - w * 0.2, w * 0.08, w * 0.2, 0.7, 0, Math.PI * 2);
    ctx.fill();
  });
}

export const POWER_COLORS: Record<PowerKind, number> = {
  boots: 0x3ddc84,
  hoverboard: 0x2fa8ff,
  magnet: 0xff4d5e,
  double: 0xffc21a,
  jetpack: 0xff8a1f,
};

/** A power up as it floats over the track: its object, outlined, in a glowing halo over a ring. */
export function pickupModel(kind: PowerKind): THREE.Group {
  return prefab(`pickup-${kind}`, () => buildPickup(kind));
}

function buildPickup(kind: PowerKind): THREE.Group {
  const b = new MeshBuilder().outline(0.022);
  const tint = POWER_COLORS[kind];
  switch (kind) {
    case "boots":
      sneaker(b, 0x3ddc84, -0.14, 0, 0, 0x8a4be8, 0xffffff);
      sneaker(b, 0x3ddc84, 0.14, 0, 0, 0x8a4be8, 0xffffff);
      // Springs under the heels: the super sneakers' bounce.
      for (const x of [-0.14, 0.14]) b.post(0.05, 0.12, { color: 0xc9ced6, finish: "metal" }, [x, -0.2, 0.08], 8);
      break;
    case "hoverboard":
      hoverboard(b, 0x2fa8ff, 0xffc21a);
      break;
    case "magnet":
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI * (i / 8);
        b.box(0.16, 0.16, 0.2, { color: 0xe8312a, finish: "gloss" }, [Math.cos(a) * 0.26, -Math.sin(a) * 0.26, 0], [0, 0, -a]);
      }
      for (const x of [-0.26, 0.26]) {
        b.box(0.17, 0.2, 0.21, { color: 0xe8312a, finish: "gloss" }, [x, 0.1, 0]);
        b.box(0.17, 0.14, 0.21, { color: 0xe4e8ee, finish: "metal" }, [x, 0.27, 0]);
      }
      break;
    case "double": {
      const badge = new THREE.MeshBasicMaterial({ map: twoTimes(), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
      badge.userData.shared = true;
      b.outline(0).panel(0.95, 0.95, badge, [0, 0, 0]);
      break;
    }
    case "jetpack":
      for (const x of [-0.14, 0.14]) {
        b.capsule(0.12, 0.32, { color: 0xff8a1f, finish: "gloss" }, [x, 0, 0]);
        b.post(0.08, 0.1, { color: 0x5b6270, finish: "metal" }, [x, -0.3, 0], 10, 0.11);
      }
      b.box(0.16, 0.34, 0.14, { color: 0x5b6270, finish: "satin" }, [0, 0.02, -0.08], undefined, 0.04);
      b.outline(0);
      for (const x of [-0.14, 0.14]) b.sphere(0.07, { color: 0xffe14d, finish: "glow" }, [x, -0.4, 0], [1, 1.6, 1]);
      break;
  }
  const group = b.build(`pickup-${kind}`);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: tint, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 }));
  halo.scale.setScalar(1.5);
  halo.material.userData.shared = true;
  group.add(halo);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 8, 36), new THREE.MeshBasicMaterial({ color: tint, toneMapped: false }));
  ring.material.userData.shared = true;
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.55;
  ring.name = "ring";
  group.add(ring);
  return group;
}

/** A chunky sneaker, toe toward -z. Also used for the runners' own shoes. */
export function sneaker(b: MeshBuilder, upper: number, x: number, y = 0, z = 0, sole = 0xffffff, stripe = 0xffffff): void {
  b.box(0.21, 0.085, 0.38, { color: sole, finish: "satin" }, [x, y - 0.1, z - 0.025], undefined, 0.035);
  b.box(0.19, 0.15, 0.32, { color: upper, finish: "satin" }, [x, y, z], undefined, 0.065);
  // The toe cap, the collar round the ankle, laces and a flash down each side.
  b.sphere(0.095, { color: upper, finish: "satin" }, [x, y - 0.02, z - 0.12], [1, 0.75, 1], 12);
  b.box(0.17, 0.1, 0.13, { color: upper, finish: "satin" }, [x, y + 0.085, z + 0.07], undefined, 0.045);
  const keep = b.thickness;
  b.outline(0);
  for (let i = 0; i < 3; i++) b.box(0.1, 0.018, 0.022, { color: 0xffffff, finish: "matte" }, [x, y + 0.075 - i * 0.012, z - 0.03 - i * 0.045]);
  for (const side of [-1, 1]) b.box(0.012, 0.04, 0.2, { color: stripe, finish: "gloss" }, [x + side * 0.097, y - 0.01, z - 0.01], [0.25, 0, 0], 0.006);
  b.outline(keep);
}

/** A hoverboard, nose toward -z: a bright deck, a stripe, and glowing pads underneath. */
export function hoverboard(b: MeshBuilder, deck: number, trim: number): void {
  b.box(0.5, 0.06, 1.3, { color: deck, finish: "gloss" }, [0, 0, 0], undefined, 0.03);
  b.box(0.36, 0.02, 1.1, { color: trim, finish: "gloss" }, [0, 0.04, 0], undefined, 0.01);
  b.box(0.3, 0.05, 0.3, { color: 0x34363f, finish: "satin" }, [0, -0.05, 0.36], undefined, 0.02);
  b.box(0.3, 0.05, 0.3, { color: 0x34363f, finish: "satin" }, [0, -0.05, -0.36], undefined, 0.02);
  for (const z of [-0.36, 0.36]) b.tube(0.08, 0.02, { color: 0x9ff3ff, finish: "glow" }, [0, -0.085, z], 14, 0.08, [0, 0, 0]);
}

function twoTimes(): THREE.Texture {
  return painted("two-times", 128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#ffc21a";
    ctx.strokeStyle = "#1f2138";
    ctx.lineWidth = 8;
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? w * 0.46 : w * 0.3;
      ctx.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.font = `900 ${h * 0.34}px ${DISPLAY_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 6;
    ctx.strokeText("2X", w / 2, h * 0.54);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("2X", w / 2, h * 0.54);
  });
}
