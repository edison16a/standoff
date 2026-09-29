import * as THREE from "three";
import { hash } from "../../engine/rng";
import { containerTexture, graffitiWallTexture } from "../art/scenery-art";
import { corrugatedTexture, woodFenceTexture } from "../art/yard-art";
import { MeshBuilder } from "../mesh-builder";
import { prefab, textured } from "../prefabs";
import { toon } from "../toon";
import type { SideKind, Theme } from "../world/themes";
import { backdrop, buildings, facing, tree, trees, type Build } from "./city";
import { platform } from "./station";
import { CHUNK } from "./track";

const hex = (css: string) => new THREE.Color(css).getHex();
/** Scenery textures are toon lit like everything else, so walls turn from the sun the same way trains do. */
const map = (key: string, make: () => THREE.Texture) => textured(key, () => toon({ map: make() }));

/**
 * What lines one side of the tracks for one chunk. `side` is -1 on the
 * left and 1 on the right, and `variant` picks one of a few versions, so
 * a handful of prefabs make a yard that never looks tiled.
 */
export function sidePiece(kind: SideKind, side: -1 | 1, variant: number, theme: Theme, themeIndex: number): THREE.Group {
  const v = variant % 4;
  return prefab(`${kind}-${side}-${v}-${themeIndex}`, () => {
    const b = new MeshBuilder();
    const extras: THREE.Object3D[] = [];
    BUILDERS[kind](b, side, v, theme, extras);
    const group = b.build(kind);
    for (const extra of extras) group.add(extra);
    return group;
  });
}

/** A concrete retaining wall covered in graffiti, with pillars and a coping along the top. */
const wall: Build = (b, side, v, theme) => {
  const x = side * 6.3;
  for (let i = 0; i < 2; i++) {
    const art = map(`wall-${v * 2 + i}-${theme.wall}`, () => graffitiWallTexture(v * 2 + i, theme.wall));
    b.panel(15, 3.9, art, [x - side * 0.26, 1.95, -7.5 - i * 15], facing(side));
  }
  b.outline(0.05);
  b.box(0.5, 4.1, CHUNK, { color: hex(theme.wall), finish: "matte" }, [x, 2.05, -CHUNK / 2]);
  b.box(0.8, 0.3, CHUNK, { color: 0xa8a092, finish: "matte" }, [x, 4.2, -CHUNK / 2]);
  for (let z = 0; z > -CHUNK; z -= 7.5) b.box(0.7, 4.4, 0.6, { color: 0xbab2a4, finish: "matte" }, [x, 2.2, z]);
  b.outline(0);
  backdrop(b, side, v, theme, 14);
};

/** A wooden plank fence with tags on it, trees peeping over, and flats beyond. */
const woodFence: Build = (b, side, v, theme) => {
  const x = side * 6;
  // The boards' pointed tops are cut out of the picture, so the sky shows between them.
  const boards = textured(`wood-${v}`, () => toon({ map: woodFenceTexture(v), alphaTest: 0.5 }));
  for (let i = 0; i < 2; i++) b.panel(15, 2.8, boards, [x - side * 0.08, 1.4, -7.5 - i * 15], facing(side));
  b.outline(0.03);
  for (let z = 0; z > -CHUNK; z -= 3.75) b.box(0.16, 3, 0.16, { color: 0x6b4426, finish: "matte" }, [x + side * 0.05, 1.5, z]);
  b.outline(0);
  for (let i = 0; i < 3; i++) tree(b, side * (9 + hash(i, v) * 2), -5 - i * 10, 1 + hash(i, v + 1) * 0.3, v * 7 + i);
  backdrop(b, side, v + 1, theme, 16);
};

const SHEETS = ["#5d8fbf", "#c8553d", "#7a9e7e", "#d9a441"];

/** Corrugated metal sheets on steel posts, a lot of containers behind them, and flats beyond. */
const metalFence: Build = (b, side, v, theme) => {
  const x = side * 6;
  const color = SHEETS[v % SHEETS.length]!;
  const sheets = map(`sheets-${color}-${v}`, () => corrugatedTexture(color, v));
  for (let i = 0; i < 2; i++) b.panel(15, 3, sheets, [x - side * 0.06, 1.5, -7.5 - i * 15], facing(side));
  b.outline(0.03);
  b.box(0.1, 3, CHUNK, { color: hex(color), finish: "matte" }, [x + side * 0.02, 1.5, -CHUNK / 2]);
  for (let z = 0; z > -CHUNK; z -= 5) b.box(0.14, 3.2, 0.14, { color: 0x5b6270, finish: "metal" }, [x - side * 0.1, 1.6, z]);
  b.outline(0);
  stacks(b, side, v, 9.5, 2);
  backdrop(b, side, v + 2, theme, 18);
};

const BOXES = ["#c8321f", "#1f5fb0", "#1f8a50", "#e0901a", "#6a3bb8", "#178a8a"];
const WORDS = ["SURF CO", "MEGA", "ZIPLINE", "OCEANIC"];

/** Stacks of shipping containers, in rows along z starting `near` metres out. */
function stacks(b: MeshBuilder, side: -1 | 1, v: number, near: number, tall: number): void {
  for (let i = 0; i < 4; i++) {
    const z = -3.5 - i * 7.2;
    const stack = 1 + Math.floor(hash(i, v * 5) * tall);
    const x = side * (near + hash(i, v) * 0.6);
    for (let s = 0; s < stack; s++) {
      const color = BOXES[(i * 3 + s + v) % BOXES.length]!;
      const art = map(`container-${color}-${(i + s) % 4}`, () => containerTexture(color, WORDS[(i + s) % 4]!));
      b.outline(0.05).box(2.5, 2.6, 6.1, { color: hex(color), finish: "matte" }, [x, 1.3 + s * 2.62, z]).outline(0);
      b.panel(6, 2.5, art, [x - side * 1.26, 1.3 + s * 2.62, z], facing(side));
    }
  }
}

/** A container yard at the harbour, with a crane over it. */
const containers: Build = (b, side, v, theme) => {
  b.outline(0.03).box(0.4, 1, CHUNK, { color: 0xb7b0a4, finish: "matte" }, [side * 6, 0.5, -CHUNK / 2]).outline(0);
  stacks(b, side, v, 8.2, 3);
  if (v % 2 === 0) {
    const x = side * 22;
    const crane = { color: 0xffb81c, finish: "satin" as const };
    b.outline(0.08);
    for (const dz of [-2, 2]) b.box(0.6, 18, 0.6, crane, [x, 9, -15 + dz]);
    b.box(16, 1, 1, crane, [x - side * 4, 18, -15]);
    b.box(2.4, 2, 2.4, { color: 0xe9e4da, finish: "matte" }, [x, 16.5, -15]);
    b.outline(0);
  }
  backdrop(b, side, v + 3, theme, 26);
};

const BUILDERS: Record<SideKind, Build> = { wall, woodFence, metalFence, platform, buildings, trees, containers };
