import { box, cyl, paint } from "../models/geo";
import type { Surface } from "../../engine/stages";
import type { SceneryKit } from "./kit";

/** How a stage dresses its platforms. */
export interface PlatformLook {
  /** The walking surface, a lip along its front edge, and the body below. */
  top: string;
  lip: string;
  body: string;
  /** Depth of the main block and of the floating platforms, front to back. */
  depth: number;
  floatDepth: number;
}

/**
 * The main block: a thick slab whose top is the floor, with a coloured
 * lip along the front edge so the edge you can fall from always reads.
 * The body runs down to the block's underside.
 */
export function mainBlock(kit: SceneryKit, s: Surface, look: PlatformLook): void {
  const w = s.x2 - s.x1;
  const cx = (s.x1 + s.x2) / 2;
  const bottom = s.bottom ?? s.top - 1;
  const h = s.top - bottom;
  kit.add(
    paint(box(w + 0.3, 0.3, look.depth + 0.3), look.top, { at: [cx, s.top - 0.15, 0] }),
    paint(box(w + 0.4, 0.14, 0.2), look.lip, { at: [cx, s.top - 0.32, look.depth / 2 + 0.12] }),
    paint(box(w, h - 0.3, look.depth), look.body, { at: [cx, bottom + (h - 0.3) / 2, 0] }),
  );
}

/**
 * A floating platform you can jump up through: a thin slab with a
 * bright top and a darker underside, so its top line is easy to judge.
 */
export function floatSlab(kit: SceneryKit, s: Surface, look: PlatformLook, thick = 0.32): void {
  const w = s.x2 - s.x1;
  const cx = (s.x1 + s.x2) / 2;
  kit.add(
    paint(box(w, 0.1, look.floatDepth), look.top, { at: [cx, s.top - 0.05, 0] }),
    paint(box(w - 0.1, thick - 0.1, look.floatDepth - 0.1), look.body, { at: [cx, s.top - 0.1 - (thick - 0.1) / 2, 0] }),
    paint(box(w + 0.1, 0.08, 0.12), look.lip, { at: [cx, s.top - 0.14, look.floatDepth / 2 + 0.04] }),
  );
}

/** Plank lines across a wooden top, for texture without a texture. */
export function planks(kit: SceneryKit, s: Surface, depth: number, colour: string, every = 0.7): void {
  for (let x = s.x1 + every / 2; x < s.x2; x += every) {
    kit.add(paint(box(0.03, 0.02, depth), colour, { at: [x, s.top + 0.005, 0] }));
  }
}

/** A round post from y0 up to y1, at x and depth z. */
export function post(kit: SceneryKit, x: number, z: number, y0: number, y1: number, r: number, colour: string, seg = 6): void {
  kit.add(paint(cyl(r, r, y1 - y0, seg), colour, { at: [x, (y0 + y1) / 2, z] }));
}
