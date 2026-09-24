import * as THREE from "three";
import { hash } from "../../engine/rng";
import { billboardTexture, containerTexture, graffitiWallTexture, neonTexture, stationSignTexture, windowsTexture } from "../art/scenery-art";
import { MeshBuilder } from "../mesh-builder";
import type { SideKind, Theme } from "../world/themes";
import { cached, CHUNK, lampGlow, textured } from "./track";

const map = (key: string, make: () => THREE.Texture, extra: THREE.MeshStandardMaterialParameters = {}) =>
  textured(key, () => new THREE.MeshStandardMaterial({ map: make(), roughness: 0.75, ...extra }));

const hex = (css: string) => new THREE.Color(css).getHex();

/**
 * What lines one side of the tracks for one chunk. `side` is -1 on the
 * left and 1 on the right, and `variant` picks one of a few versions, so
 * a handful of prefabs make a yard that never looks tiled.
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

type Build = (b: MeshBuilder, side: -1 | 1, v: number, theme: Theme, extras: THREE.Object3D[]) => void;

const wall: Build = (b, side, v, theme) => {
  const x = side * 6.3;
  for (let i = 0; i < 2; i++) {
    const art = map(`wall-${v * 2 + i}-${theme.wall}`, () => graffitiWallTexture(v * 2 + i, theme.wall));
    b.panel(15, 3.9, art, [x - side * 0.26, 1.95, -7.5 - i * 15], [0, -side * Math.PI / 2, 0]);
  }
  b.box(0.5, 4.1, CHUNK, { color: hex(theme.wall), finish: "matte" }, [x, 2.05, -CHUNK / 2]);
  b.box(0.8, 0.3, CHUNK, { color: 0x8f877b, finish: "matte" }, [x, 4.2, -CHUNK / 2]);
  for (let z = 0; z > -CHUNK; z -= 7.5) b.box(0.7, 4.4, 0.6, { color: 0xa8a092, finish: "matte" }, [x, 2.2, z]);
  backdrop(b, side, v, theme, 14);
};

const fence: Build = (b, side, v, theme) => {
  const x = side * 6;
  const mesh = textured("chain-link", () => new THREE.MeshStandardMaterial({ map: chainLink(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.5 }));
  b.panel(CHUNK, 2.6, mesh, [x, 1.4, -CHUNK / 2], [0, -side * Math.PI / 2, 0]);
  for (let z = 0; z > -CHUNK; z -= 3.75) b.post(0.05, 2.9, { color: 0x9aa3ad, finish: "metal" }, [x, 1.45, z], 8);
  b.box(0.06, 0.06, CHUNK, { color: 0x9aa3ad, finish: "metal" }, [x, 2.75, -CHUNK / 2]);
  // Bushes along the fence and a billboard behind it.
  for (let i = 0; i < 5; i++) b.sphere(0.8 + hash(i, v) * 0.5, { color: 0x4caf50, finish: "matte" }, [x + side * 1.2, 0.5, -3 - i * 6 - hash(i, v + 3) * 2], [1.4, 0.9, 1.2], 10);
  const board = map(`billboard-${v}`, () => billboardTexture(v), { roughness: 0.5 });
  b.box(0.3, 4.5, 0.3, { color: 0x6f7a88, finish: "metal" }, [x + side * 5, 2.25, -15]);
  b.panel(9, 4.5, board, [x + side * 4.8, 6.4, -15], [0, -side * Math.PI / 2, 0]);
  b.box(0.3, 4.9, 9.4, { color: 0x2a2d35, finish: "satin" }, [x + side * 5, 6.4, -15]);
  backdrop(b, side, v + 1, theme, 18);
};

const buildings: Build = (b, side, v, theme) => {
  b.box(0.4, 1.2, CHUNK, { color: 0x9a948a, finish: "matte" }, [side * 6, 0.6, -CHUNK / 2]);
  backdrop(b, side, v, theme, 8.5);
};

/** A row of blocks set back from the tracks: windows, rooftop tanks and a ledge. */
function backdrop(b: MeshBuilder, side: -1 | 1, v: number, theme: Theme, near: number): void {
  let z = 0;
  let i = 0;
  while (z > -CHUNK) {
    const width = 8 + hash(i, v * 7) * 5;
    const height = 9 + hash(i, v * 7 + 1) * 14;
    const depth = 7 + hash(i, v * 7 + 2) * 4;
    const tint = theme.buildings[(i + v) % theme.buildings.length]!;
    const facade = map(`windows-${tint}-${(i + v) % 3}`, () => windowsTexture(tint, (i + v) % 3));
    const x = side * (near + depth / 2);
    const mid = z - width / 2;
    b.box(depth, height, width, { color: hex(tint), finish: "matte" }, [x, height / 2, mid]);
    b.panel(width - 0.4, height - 1, facade, [x - side * (depth / 2 + 0.02), height / 2, mid], [0, -side * Math.PI / 2, 0]);
    b.box(depth + 0.4, 0.4, width + 0.4, { color: 0xe9e4da, finish: "matte" }, [x, height + 0.2, mid]);
    if (hash(i, v + 11) > 0.5) {
      b.post(1, 2, { color: 0x8a6a4a, finish: "matte" }, [x, height + 1.6, mid], 12);
      b.post(1.1, 0.5, { color: 0x6a4a3a, finish: "matte" }, [x, height + 2.8, mid], 12, 0.2);
    } else b.box(2, 1.2, 2.4, { color: 0xb8c0ca, finish: "metal" }, [x, height + 1, mid + 1]);
    z -= width + 0.6;
    i++;
  }
}

const platform: Build = (b, side, v) => {
  const inner = 5.3;
  const outer = 10.5;
  const w = outer - inner;
  const cx = side * (inner + w / 2);
  b.box(w, 1.1, CHUNK, { color: 0xc9c3b8, finish: "matte" }, [cx, 0.55, -CHUNK / 2]);
  b.box(0.5, 0.04, CHUNK, { color: 0xffd21f, finish: "satin" }, [side * (inner + 0.35), 1.12, -CHUNK / 2]);
  // A canopy on pillars, benches and a name board.
  for (let z = -4; z > -CHUNK; z -= 8) b.post(0.16, 3.6, { color: 0x1f5fd6, finish: "satin" }, [side * (outer - 1.5), 2.9, z], 12);
  b.box(w + 0.6, 0.25, CHUNK, { color: 0xe8312a, finish: "satin" }, [cx + side * 0.3, 4.75, -CHUNK / 2], undefined, 0.08);
  b.box(w + 0.8, 0.12, CHUNK, { color: 0xf2f2f2, finish: "satin" }, [cx + side * 0.3, 4.6, -CHUNK / 2]);
  for (const z of [-8, -22]) {
    b.box(0.5, 0.1, 2, { color: 0x6b4a33, finish: "satin" }, [side * (outer - 2.6), 1.6, z]);
    b.box(0.1, 0.5, 2, { color: 0x6b4a33, finish: "satin" }, [side * (outer - 2.35), 1.9, z]);
  }
  const names = ["CENTRAL", "HARBOR ST", "PARK LANE", "UPTOWN"];
  const sign = map(`station-${v}`, () => stationSignTexture(names[v]!), { roughness: 0.4 });
  // The name board hangs from the canopy, facing the tracks, with its frame just behind it.
  b.panel(5, 0.94, sign, [side * (inner + 0.64), 3.4, -15], [0, -side * Math.PI / 2, 0]);
  b.box(0.1, 1.05, 5.1, { color: 0x1d2640, finish: "satin" }, [side * (inner + 0.72), 3.4, -15]);
  for (const x of [-1.6, 1.6]) b.box(0.05, 1.2, 0.05, { color: 0x1d2640, finish: "satin" }, [side * (inner + 0.72), 4.3, -15 + x]);
  b.box(0.3, 8, CHUNK, { color: 0xd8d2c6, finish: "matte" }, [side * outer, 4, -CHUNK / 2]);
  // Posters along the back wall.
  for (const z of [-7.5, -22.5]) {
    const poster = map(`billboard-${(v + (z < -10 ? 1 : 0)) % 4}`, () => billboardTexture((v + (z < -10 ? 1 : 0)) % 4), { roughness: 0.5 });
    b.panel(4, 2, poster, [side * (outer - 0.16), 2.6, z], [0, -side * Math.PI / 2, 0]);
  }
};

const containers: Build = (b, side, v, theme) => {
  const colors = ["#e8412f", "#1f7fe0", "#2cb865", "#ff9a1f", "#8e4de8", "#1fc2c2"];
  const words = ["SURF CO", "MEGA", "ZIPLINE", "OCEANIC"];
  for (let i = 0; i < 4; i++) {
    const z = -3.5 - i * 7.2;
    const stack = 1 + Math.floor(hash(i, v * 5) * 3);
    for (let s = 0; s < stack; s++) {
      const color = colors[(i * 3 + s + v) % colors.length]!;
      const art = map(`container-${color}-${(i + s) % 4}`, () => containerTexture(color, words[(i + s) % 4]!), { roughness: 0.6, metalness: 0.2 });
      const x = side * (8.2 + hash(i + s, v) * 0.6);
      b.box(2.5, 2.6, 6.1, { color: hex(color), finish: "satin" }, [x, 1.3 + s * 2.62, z]);
      b.panel(6, 2.5, art, [x - side * 1.26, 1.3 + s * 2.62, z], [0, -side * Math.PI / 2, 0]);
    }
  }
  b.box(0.4, 1, CHUNK, { color: 0x6f6a62, finish: "matte" }, [side * 6, 0.5, -CHUNK / 2]);
  // A dockside crane in the distance.
  if (v % 2 === 0) {
    const x = side * 22;
    for (const dz of [-2, 2]) b.box(0.6, 18, 0.6, { color: 0xffb627, finish: "satin" }, [x, 9, -15 + dz]);
    b.box(16, 1, 1, { color: 0xffb627, finish: "satin" }, [x - side * 4, 18, -15]);
  }
  void theme;
};

const neon: Build = (b, side, v, theme, extras) => {
  buildings(b, side, v, theme, extras);
  const signs = [["ARCADE", "#ff3df0"], ["NOODLES", "#3dffea"], ["DISCO", "#ffe14d"], ["24H", "#7dff3d"]] as const;
  for (let i = 0; i < 2; i++) {
    const [word, color] = signs[(v + i) % 4]!;
    const art = textured(`neon-${word}`, () => new THREE.MeshBasicMaterial({ map: neonTexture(word, color), toneMapped: false }));
    const z = -8 - i * 14;
    b.panel(6, 1.9, art, [side * 8.2, 4.5 + i * 2, z], [0, -side * Math.PI / 2, 0]);
    const glow = lampGlow(7);
    glow.position.set(side * 7.9, 4.5 + i * 2, z);
    extras.push(glow);
  }
};

const trees: Build = (b, side, v, theme) => {
  b.box(0.4, 0.8, CHUNK, { color: 0xc9b48f, finish: "matte" }, [side * 6, 0.4, -CHUNK / 2]);
  for (let i = 0; i < 4; i++) {
    const x = side * (7.5 + hash(i, v) * 4);
    const z = -4 - i * 7 - hash(i, v + 1) * 2;
    const tall = 6 + hash(i, v + 2) * 3;
    // A leaning palm: a ringed trunk and a crown of fronds.
    for (let s = 0; s < 6; s++) b.post(0.26 - s * 0.02, tall / 6, { color: s % 2 ? 0x8a6a4a : 0x9c7a55, finish: "matte" }, [x + side * s * 0.12, (tall / 6) * (s + 0.5), z], 8);
    for (let f = 0; f < 7; f++) {
      const a = (f / 7) * Math.PI * 2;
      b.box(0.5, 0.08, 2.6, { color: f % 2 ? 0x2e9e4a : 0x3cbf5a, finish: "satin" }, [x + side * 0.7 + Math.cos(a) * 1.2, tall + 0.1, z + Math.sin(a) * 1.2], [0.35, -a + Math.PI / 2, 0]);
    }
  }
  backdrop(b, side, v + 2, theme, 16);
};

const BUILDERS: Record<SideKind, Build> = { wall, fence, buildings, platform, containers, neon, trees };

function chainLink(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.strokeStyle = "rgba(200,208,218,1)";
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
