import * as THREE from "three";
import { hash } from "../../engine/rng";
import { nightWindowsTexture } from "../art/night-art";
import { neonTexture } from "../art/scenery-art";
import { MeshBuilder } from "../mesh-builder";
import { hologramMaterial } from "../world/hologram";
import type { Theme } from "../world/themes";
import { CHUNK, glow, lampGlow, pool, textured } from "./track";

export type Build = (b: MeshBuilder, side: -1 | 1, v: number, theme: Theme, extras: THREE.Object3D[]) => void;

const hex = (css: string) => new THREE.Color(css).getHex();
const css = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

/** Lit windows need no light to be seen, so facades are drawn unlit: bright at night and cheap. */
const lit = (key: string, make: () => THREE.Texture) => textured(key, () => new THREE.MeshBasicMaterial({ map: make() }));

/** A row of dark towers set back from the tracks: lit windows, a neon line along each roof, tanks and signs on top. */
export function backdrop(b: MeshBuilder, side: -1 | 1, v: number, theme: Theme, near: number): void {
  let z = 0;
  let i = 0;
  while (z > -CHUNK) {
    const width = 8 + hash(i, v * 7) * 5;
    const height = 10 + hash(i, v * 7 + 1) * 18;
    const depth = 7 + hash(i, v * 7 + 2) * 4;
    const tint = theme.buildings[(i + v) % theme.buildings.length]!;
    const facade = lit(`night-${tint}-${(i + v) % 3}`, () => nightWindowsTexture(tint, (i + v) % 3));
    const x = side * (near + depth / 2);
    const mid = z - width / 2;
    const face = x - side * (depth / 2 + 0.02);
    b.box(depth, height, width, { color: hex(tint), finish: "matte" }, [x, height / 2, mid]);
    b.panel(width - 0.4, height - 1, facade, [face, height / 2, mid], [0, -side * Math.PI / 2, 0]);
    const trim = theme.neon[(i + v) % 3]!;
    b.box(0.12, 0.12, width, glow(trim), [face - side * 0.06, height, mid]);
    if (hash(i, v + 11) > 0.55) b.box(0.1, height * 0.8, 0.1, glow(trim), [face - side * 0.05, height * 0.45, z - 0.2]);
    if (hash(i, v + 13) > 0.6) b.box(2.4, 1.2, 2.4, { color: 0x2a2838, finish: "metal" }, [x, height + 0.6, mid + 1]);
    z -= width + 0.6;
    i++;
  }
}

export const buildings: Build = (b, side, v, theme) => {
  b.box(0.4, 1.2, CHUNK, { color: 0x24212f, finish: "matte" }, [side * 6, 0.6, -CHUNK / 2]);
  b.box(0.08, 0.08, CHUNK, glow(theme.neon[1]), [side * 5.78, 1.2, -CHUNK / 2]);
  backdrop(b, side, v, theme, 8.5);
};

const SIGNS = ["ARCADE", "NOODLES", "DISCO", "24H", "RAMEN", "CLUB"];

/** Shop and club signs hanging over the street, each with its halo and its streak of light on the wet ground. */
export const neon: Build = (b, side, v, theme, extras) => {
  buildings(b, side, v, theme, extras);
  for (let i = 0; i < 2; i++) {
    const word = SIGNS[(v + i * 3) % SIGNS.length]!;
    const color = theme.neon[(v + i + 1) % 3]!;
    const art = textured(`neon-${word}-${color}`, () => new THREE.MeshBasicMaterial({ map: neonTexture(word, css(color)), toneMapped: false }));
    const z = -8 - i * 14;
    const y = 4.5 + i * 2;
    b.panel(6, 1.9, art, [side * 8.2, y, z], [0, -side * Math.PI / 2, 0]);
    b.panel(1.6, 7, pool(color, 0.45), [side * 5.3, 0.03, z], [-Math.PI / 2, 0, 0]);
    const halo = lampGlow(7, color, 0.45);
    halo.position.set(side * 7.9, y, z);
    extras.push(halo);
  }
};

/** Holographic billboards on tall frames, flickering over the rooftops. */
export const holo: Build = (b, side, v, theme, extras) => {
  b.box(0.4, 1, CHUNK, { color: 0x24212f, finish: "matte" }, [side * 6, 0.5, -CHUNK / 2]);
  backdrop(b, side, v + 2, theme, 15);
  const count = 1 + (v % 2);
  for (let i = 0; i < count; i++) {
    const [color, edge] = i % 2 ? [theme.neon[2], theme.neon[0]] : [theme.neon[1], theme.neon[2]];
    const z = -9 - i * 13 - (v % 3);
    const x = side * (9.5 + i * 1.5);
    const size = 7 - i;
    const y = 4.5 + size / 2 + (v % 2);
    b.panel(size, size, hologramMaterial(v + i, color, edge), [x, y, z], [0, -side * Math.PI / 2, 0]);
    // A dark frame with a glowing projector underneath, and the light it throws down.
    b.box(0.3, y - size / 2, 0.3, { color: 0x1c1b26, finish: "metal" }, [x + side * 0.3, (y - size / 2) / 2, z]);
    b.box(0.5, 0.2, size, { color: 0x1c1b26, finish: "metal" }, [x + side * 0.2, y - size / 2 - 0.1, z]);
    b.box(0.1, 0.06, size - 0.2, glow(color), [x - side * 0.05, y - size / 2 - 0.02, z]);
    b.panel(1.6, size + 2, pool(color, 0.35), [side * 5.3, 0.03, z], [-Math.PI / 2, 0, 0]);
    const halo = lampGlow(size * 1.6, color, 0.22);
    halo.position.set(x, y, z);
    extras.push(halo);
  }
};
