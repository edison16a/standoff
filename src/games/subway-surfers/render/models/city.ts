import * as THREE from "three";
import { hash } from "../../engine/rng";
import { facadeAtlas } from "../art/scenery-art";
import { SHOPS, shopFrontTexture, shopSignAtlas } from "../art/yard-art";
import type { MeshBuilder } from "../mesh-builder";
import { textured } from "../prefabs";
import { toon } from "../toon";
import type { Theme } from "../world/themes";
import { CHUNK } from "./track";

export type Build = (b: MeshBuilder, side: -1 | 1, v: number, theme: Theme, extras: THREE.Object3D[]) => void;

const hex = (css: string) => new THREE.Color(css).getHex();
const darker = (css: string, k: number) => new THREE.Color(css).multiplyScalar(k).getHex();
/** Turns a panel to face the tracks from the given side. */
export const facing = (side: -1 | 1): [number, number, number] => [0, (-side * Math.PI) / 2, 0];

/**
 * A row of blocks of flats set back from the tracks: colourful fronts
 * full of windows, a cornice along each roof, and water tanks, vents and
 * aerials up top. All the fronts share one texture, so the whole row is
 * a few draws.
 */
export function backdrop(b: MeshBuilder, side: -1 | 1, v: number, theme: Theme, near: number): void {
  const fronts = textured(`facades-${theme.name}`, () => toon({ map: facadeAtlas(theme.buildings) }));
  const columns = theme.buildings.length;
  let z = 0;
  let i = 0;
  while (z > -CHUNK) {
    const width = 8 + hash(i, v * 7) * 5;
    const height = 9 + hash(i, v * 7 + 1) * 15;
    const depth = 7 + hash(i, v * 7 + 2) * 4;
    const column = (i + v) % columns;
    const tint = theme.buildings[column]!;
    const x = side * (near + depth / 2);
    const mid = z - width / 2;
    const face = x - side * (depth / 2 + 0.02);
    b.outline(0.07).box(depth, height, width, { color: hex(tint), finish: "matte" }, [x, height / 2, mid]);
    b.box(depth + 0.5, 0.6, width + 0.5, { color: darker(tint, 0.78), finish: "matte" }, [x, height + 0.3, mid]);
    b.outline(0);
    b.panel(width - 0.6, height - 1.2, fronts, [face, height / 2 - 0.2, mid], facing(side), [column / columns, 0, (column + 1) / columns, 1]);
    rooftop(b, x, height + 0.6, mid, width, i + v);
    z -= width + 0.8;
    i++;
  }
}

/** What stands on a roof: a water tank on legs, a box of vents, or an aerial. */
function rooftop(b: MeshBuilder, x: number, y: number, z: number, width: number, seed: number): void {
  const roll = hash(seed, 41);
  b.outline(0.05);
  if (roll < 0.4) {
    const tz = z + (hash(seed, 43) - 0.5) * width * 0.5;
    for (const dx of [-0.6, 0.6]) for (const dz of [-0.6, 0.6]) b.box(0.12, 1.4, 0.12, { color: 0x4b3a2c, finish: "matte" }, [x + dx, y + 0.7, tz + dz]);
    b.post(1.1, 1.8, { color: 0x9a6a44, finish: "matte" }, [x, y + 2.3, tz], 12);
    b.add(new THREE.ConeGeometry(1.2, 0.8, 12), { color: 0x6b4a33, finish: "matte" }, [x, y + 3.6, tz]);
  } else if (roll < 0.75) {
    b.box(2.4, 1.1, 1.8, { color: 0xc9ced6, finish: "metal" }, [x, y + 0.55, z + 1.5], undefined, 0.1);
  } else {
    b.post(0.05, 3, { color: 0x5b6270, finish: "metal" }, [x, y + 1.5, z], 6);
  }
  b.outline(0);
}

/** Shops at street level along the tracks: glass fronts, striped awnings and name boards, with flats above. */
export const buildings: Build = (b, side, v, theme) => {
  const front = textured("shop-front", () => toon({ map: shopFrontTexture() }));
  const signs = textured("shop-signs", () => toon({ map: shopSignAtlas() }));
  b.outline(0.03).box(0.4, 1.1, CHUNK, { color: 0xb7b0a4, finish: "matte" }, [side * 6, 0.55, -CHUNK / 2]).outline(0);
  const near = 8.5;
  for (let i = 0; i < 3; i++) {
    const z = -5 - i * 10;
    const face = side * (near - 0.03);
    const shop = (v + i * 2) % SHOPS.length;
    b.panel(8, 3.6, front, [face, 1.8, z], facing(side));
    b.panel(6, 1.1, signs, [side * (near - 0.08), 4.3, z], facing(side), [0, 1 - (shop + 1) / SHOPS.length, 1, 1 - shop / SHOPS.length]);
    // A striped awning leaning out over the pavement.
    const color = theme.accent[(v + i) % 3]!;
    b.outline(0.03);
    b.box(1.6, 0.12, 7.6, { color, finish: "satin" }, [side * (near - 0.75), 3.5, z], [0, 0, side * 0.35]);
    b.outline(0);
    for (let s = 0; s < 4; s++) b.box(1.62, 0.13, 0.9, { color: 0xffffff, finish: "satin" }, [side * (near - 0.75), 3.5, z - 3.0 + s * 2], [0, 0, side * 0.35]);
  }
  backdrop(b, side, v, theme, near);
};

const LEAVES = [0x4caf50, 0x3f9c46, 0x66bb5a, 0x57a84c] as const;

/** A round cartoon tree: a trunk and a crown of three or four puffs of leaves. */
export function tree(b: MeshBuilder, x: number, z: number, size: number, seed: number): void {
  const leaf = LEAVES[seed % LEAVES.length]!;
  b.outline(0.04);
  b.post(0.16 * size, 2.2 * size, { color: 0x8a5a36, finish: "matte" }, [x, 1.1 * size, z], 8, 0.12 * size);
  const puffs = 3 + (seed % 2);
  for (let p = 0; p < puffs; p++) {
    const a = (p / puffs) * Math.PI * 2 + seed;
    const r = (0.95 + hash(seed, p) * 0.35) * size;
    b.sphere(r, { color: p === 0 ? leaf : shade(leaf, 0.92 + 0.12 * (p % 2)), finish: "matte" }, [x + Math.cos(a) * 0.55 * size, (2.6 + (p % 2) * 0.5) * size, z + Math.sin(a) * 0.55 * size], [1, 0.9, 1], 10);
  }
  b.sphere(0.9 * size, { color: shade(leaf, 1.1), finish: "matte" }, [x, 3.4 * size, z], [1, 0.9, 1], 10);
  b.outline(0);
}

function shade(color: number, k: number): number {
  return new THREE.Color(color).multiplyScalar(k).getHex();
}

/** A strip of park: grass, a low hedge by the tracks, rows of trees, bushes and a lamp post, and flats beyond. */
export const trees: Build = (b, side, v, theme) => {
  b.panel(12, CHUNK, { color: 0x7fbf4c, finish: "matte" }, [side * 12, 0.005, -CHUNK / 2], [-Math.PI / 2, 0, 0]);
  b.outline(0.035).box(0.9, 0.9, CHUNK - 0.4, { color: 0x3f9c46, finish: "matte" }, [side * 6.2, 0.45, -CHUNK / 2], undefined, 0.3).outline(0);
  for (let i = 0; i < 5; i++) {
    const z = -3 - i * 6 - hash(i, v) * 2;
    tree(b, side * (8.5 + hash(i, v + 3) * 1.5), z, 0.9 + hash(i, v + 5) * 0.4, v * 5 + i);
    if (i % 2 === 0) tree(b, side * (13 + hash(i, v + 7) * 2), z - 3, 1.1 + hash(i, v + 9) * 0.3, v * 3 + i + 1);
  }
  b.outline(0.03);
  b.post(0.07, 4, { color: 0x2f3440, finish: "metal" }, [side * 7.2, 2, -15], 8);
  b.box(0.6, 0.18, 0.3, { color: 0x2f3440, finish: "metal" }, [side * 6.95, 4, -15], undefined, 0.05);
  b.outline(0);
  backdrop(b, side, v + 1, theme, 19);
};
