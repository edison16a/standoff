import type * as THREE from "three";
import type { MeshBuilder } from "../../kit/mesh-builder";
import type { LookKit } from "../model/look-kit";

/** One pixel of the sprite, in metres. The blade's three inner pixels are about the engine's width for it. */
const PIXEL = 0.022;
const DEPTH = 0.03;
/** The sprite column on the grip's middle, where the fist holds it. */
const GRIP = 5;
/** The guard's two columns, and where the blade starts. */
const GUARD = 8;
const BLADE = 10;

type Swatch = "outline" | "blade" | "shine" | "guard" | "guardDark" | "wrap" | "wrapDark" | "gem";

const PALETTE: Record<Swatch, { color: number; glow?: boolean; roughness?: number }> = {
  outline: { color: 0x6a1257 },
  blade: { color: 0xff4fc3, roughness: 0.45 },
  shine: { color: 0xffc2ee, roughness: 0.3 },
  guard: { color: 0xffc83d },
  guardDark: { color: 0xb07a12 },
  wrap: { color: 0x7a4a24 },
  wrapDark: { color: 0x4a2a12 },
  gem: { color: 0x4ff0ff, glow: true },
};

/** Every pixel of the sprite: column along the sword, row across it (0 on the axis, up is the back). */
function sprite(tip: number): { c: number; r: number; swatch: Swatch }[] {
  const cells: { c: number; r: number; swatch: Swatch }[] = [];
  const put = (c: number, r: number, swatch: Swatch) => cells.push({ c, r, swatch });
  // A gem pommel, the wrapped grip, and a tall cross guard with darker tips.
  for (const [c, r] of [[0, 0], [1, 0], [2, 0], [1, 1], [1, -1]] as const) put(c, r, "gem");
  for (let c = 3; c < GUARD; c++) {
    put(c, 0, "wrap");
    put(c, 1, c % 2 ? "wrapDark" : "wrap");
    put(c, -1, c % 2 ? "wrap" : "wrapDark");
  }
  for (let c = GUARD; c < BLADE; c++) {
    for (let r = -3; r <= 3; r++) put(c, r, Math.abs(r) === 3 ? "guardDark" : "guard");
  }
  // The blade: outlined, with a shine along the back, stepping down to a point.
  for (let c = BLADE; c <= tip; c++) {
    const toTip = tip - c;
    if (toTip >= 3) {
      put(c, 2, "outline");
      put(c, -2, "outline");
    }
    if (toTip >= 2) put(c, 1, toTip === 2 ? "outline" : (c - BLADE) % 5 === 4 ? "blade" : "shine");
    if (toTip >= 2) put(c, -1, toTip === 2 ? "outline" : "blade");
    put(c, 0, toTip === 0 ? "outline" : "blade");
  }
  return cells;
}

/**
 * The Block Hero's sword, drawn as pixel art and built from cubes. It is
 * stretched along its length to exactly `length`, so the tip is where the
 * engine counts hits whatever the sprite's pixel count.
 */
export function pixelSword(b: MeshBuilder, kit: LookKit, length: number): void {
  const tip = GRIP + Math.round(length / PIXEL - 0.5);
  const along = length / ((tip - GRIP + 0.5) * PIXEL);
  const materials = new Map<Swatch, THREE.Material>();
  const material = (swatch: Swatch) => {
    let found = materials.get(swatch);
    if (!found) {
      const { color, glow, roughness } = PALETTE[swatch];
      found = glow ? kit.glow(color, 1.6) : kit.matte(color, roughness ?? 0.6);
      materials.set(swatch, found);
    }
    return found;
  };
  for (const { c, r, swatch } of sprite(tip)) {
    // The shine stands a hair proud of the rest and catches the light like a bevel.
    const depth = swatch === "shine" ? DEPTH * 1.15 : swatch === "outline" ? DEPTH * 0.85 : DEPTH;
    b.box(PIXEL * along, PIXEL, depth, material(swatch), [(c - GRIP) * PIXEL * along, r * PIXEL, 0]);
  }
}
