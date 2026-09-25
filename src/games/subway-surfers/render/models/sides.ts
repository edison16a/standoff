import * as THREE from "three";
import { hash } from "../../engine/rng";
import { containerTexture, graffitiWallTexture, stationSignTexture } from "../art/scenery-art";
import { MeshBuilder } from "../mesh-builder";
import { hologramMaterial } from "../world/hologram";
import type { SideKind, Theme } from "../world/themes";
import { backdrop, buildings, holo, neon, type Build } from "./city";
import { cached, CHUNK, glow, textured } from "./track";

/** Scenery is painted flat on Lambert shading: it fills most of the screen, and this keeps it cheap to draw. */
const map = (key: string, make: () => THREE.Texture) => textured(key, () => new THREE.MeshLambertMaterial({ map: make() }));
const unlit = (key: string, make: () => THREE.Texture) => textured(key, () => new THREE.MeshBasicMaterial({ map: make() }));

const hex = (css: string) => new THREE.Color(css).getHex();

/**
 * What lines one side of the tracks for one chunk. `side` is -1 on the
 * left and 1 on the right, and `variant` picks one of a few versions, so
 * a handful of prefabs make a city that never looks tiled.
 */
export function sidePiece(kind: SideKind, side: -1 | 1, variant: number, theme: Theme, themeIndex: number): THREE.Group {
  const v = variant % 4;
  return cached(`${kind}-${side}-${v}-${themeIndex}`, () => {
    const b = new MeshBuilder();
    const extras: THREE.Object3D[] = [];
    BUILDERS[kind](b, side, v, theme, extras);
    const group = b.build(kind);
    for (const extra of extras) group.add(extra);
    return group;
  });
}

/** A graffiti wall, washed by a strip of neon along its top and foot. */
const wall: Build = (b, side, v, theme) => {
  const x = side * 6.3;
  for (let i = 0; i < 2; i++) {
    const art = map(`wall-${v * 2 + i}-${theme.wall}`, () => graffitiWallTexture(v * 2 + i, theme.wall));
    b.panel(15, 3.9, art, [x - side * 0.26, 1.95, -7.5 - i * 15], [0, -side * Math.PI / 2, 0]);
  }
  b.box(0.5, 4.1, CHUNK, { color: hex(theme.wall), finish: "matte" }, [x, 2.05, -CHUNK / 2]);
  b.box(0.8, 0.3, CHUNK, { color: 0x1f1c2a, finish: "matte" }, [x, 4.2, -CHUNK / 2]);
  b.box(0.08, 0.08, CHUNK, glow(theme.neon[1]), [x - side * 0.42, 4.02, -CHUNK / 2]);
  b.box(0.08, 0.08, CHUNK, glow(theme.neon[0]), [x - side * 0.3, 0.12, -CHUNK / 2]);
  for (let z = 0; z > -CHUNK; z -= 7.5) b.box(0.7, 4.4, 0.6, { color: 0x2a2636, finish: "matte" }, [x, 2.2, z]);
  backdrop(b, side, v, theme, 14);
};

/** A chain link fence with a hologram over the lot behind it. */
const fence: Build = (b, side, v, theme) => {
  const x = side * 6;
  const mesh = textured("chain-link", () => new THREE.MeshLambertMaterial({ map: chainLink(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
  b.panel(CHUNK, 2.6, mesh, [x, 1.4, -CHUNK / 2], [0, -side * Math.PI / 2, 0]);
  for (let z = 0; z > -CHUNK; z -= 3.75) b.post(0.05, 2.9, { color: 0x4a4f5c, finish: "metal" }, [x, 1.45, z], 8);
  b.box(0.06, 0.06, CHUNK, glow(theme.neon[0]), [x, 2.75, -CHUNK / 2]);
  b.box(0.3, 4.5, 0.3, { color: 0x1c1b26, finish: "metal" }, [x + side * 5, 2.25, -15]);
  b.panel(9, 4.5, hologramMaterial(v, theme.neon[1], theme.neon[2]), [x + side * 4.8, 6.4, -15], [0, -side * Math.PI / 2, 0]);
  b.box(0.1, 0.1, 9, glow(theme.neon[1]), [x + side * 4.85, 4.1, -15]);
  backdrop(b, side, v + 1, theme, 18);
};

const platform: Build = (b, side, v, theme) => {
  const inner = 5.3;
  const outer = 10.5;
  const w = outer - inner;
  const cx = side * (inner + w / 2);
  b.box(w, 1.1, CHUNK, { color: 0x2c2838, finish: "gloss" }, [cx, 0.55, -CHUNK / 2]);
  b.box(0.3, 0.05, CHUNK, glow(theme.neon[2]), [side * (inner + 0.3), 1.12, -CHUNK / 2]);
  // A canopy on pillars, lit from beneath, and a name board.
  for (let z = -4; z > -CHUNK; z -= 8) b.post(0.16, 3.6, { color: 0x1f1c2a, finish: "metal" }, [side * (outer - 1.5), 2.9, z], 12);
  b.box(w + 0.6, 0.25, CHUNK, { color: 0x1a1824, finish: "satin" }, [cx + side * 0.3, 4.75, -CHUNK / 2], undefined, 0.08);
  b.box(0.12, 0.1, CHUNK, glow(theme.neon[0]), [side * (inner + 0.1), 4.6, -CHUNK / 2]);
  b.box(0.12, 0.1, CHUNK, glow(theme.neon[1]), [side * (outer - 0.4), 4.6, -CHUNK / 2]);
  const names = ["CENTRAL", "HARBOR ST", "PARK LANE", "UPTOWN"];
  const sign = unlit(`station-${v}`, () => stationSignTexture(names[v]!));
  // The name board hangs from the canopy, facing the tracks, with its frame just behind it.
  b.panel(5, 0.94, sign, [side * (inner + 0.64), 3.4, -15], [0, -side * Math.PI / 2, 0]);
  b.box(0.1, 1.05, 5.1, { color: 0x14121c, finish: "satin" }, [side * (inner + 0.72), 3.4, -15]);
  for (const x of [-1.6, 1.6]) b.box(0.05, 1.2, 0.05, { color: 0x14121c, finish: "satin" }, [side * (inner + 0.72), 4.3, -15 + x]);
  b.box(0.3, 8, CHUNK, { color: 0x1d1a28, finish: "matte" }, [side * outer, 4, -CHUNK / 2]);
  // Holographic adverts along the back wall.
  for (const z of [-7.5, -22.5]) b.panel(4, 2.6, hologramMaterial(v + (z < -10 ? 1 : 0), theme.neon[1], theme.neon[0]), [side * (outer - 0.2), 2.6, z], [0, -side * Math.PI / 2, 0]);
};

/** Shipping containers at the harbour, their tops traced in neon, and a crane with its warning lamps. */
const containers: Build = (b, side, v, theme) => {
  const colors = ["#c8321f", "#1f5fb0", "#1f8a50", "#d07a12", "#6a3bb8", "#178a8a"];
  const words = ["SURF CO", "MEGA", "ZIPLINE", "OCEANIC"];
  for (let i = 0; i < 4; i++) {
    const z = -3.5 - i * 7.2;
    const stack = 1 + Math.floor(hash(i, v * 5) * 3);
    const x = side * (8.2 + hash(i, v) * 0.6);
    for (let s = 0; s < stack; s++) {
      const color = colors[(i * 3 + s + v) % colors.length]!;
      const art = map(`container-${color}-${(i + s) % 4}`, () => containerTexture(color, words[(i + s) % 4]!));
      b.box(2.5, 2.6, 6.1, { color: hex(color), finish: "satin" }, [x, 1.3 + s * 2.62, z]);
      b.panel(6, 2.5, art, [x - side * 1.26, 1.3 + s * 2.62, z], [0, -side * Math.PI / 2, 0]);
    }
    b.box(0.08, 0.08, 6.1, glow(theme.neon[(i + v) % 3]!), [x - side * 1.28, stack * 2.62, z]);
  }
  b.box(0.4, 1, CHUNK, { color: 0x24212f, finish: "matte" }, [side * 6, 0.5, -CHUNK / 2]);
  if (v % 2 === 0) {
    const x = side * 22;
    for (const dz of [-2, 2]) b.box(0.6, 18, 0.6, { color: 0x2a2838, finish: "satin" }, [x, 9, -15 + dz]);
    b.box(16, 1, 1, { color: 0x2a2838, finish: "satin" }, [x - side * 4, 18, -15]);
    b.box(16, 0.1, 0.1, glow(theme.neon[0]), [x - side * 4, 17.45, -14.45]);
    for (const dx of [0, -side * 11]) b.sphere(0.35, glow(0xff3b30), [x + dx, 18.8, -15]);
  }
};

const BUILDERS: Record<SideKind, Build> = { wall, fence, buildings, platform, containers, neon, holo };

function chainLink(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.strokeStyle = "rgba(150,160,190,1)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(64, 64);
  ctx.moveTo(64, 0);
  ctx.lineTo(0, 64);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(60, 5);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
