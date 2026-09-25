import type { StageDef } from "../../engine/stages";

export interface Box {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

export interface Framing {
  /** The point looked at, and how far back the camera stands. */
  x: number;
  y: number;
  distance: number;
}

/** Room left around the fighters, in metres: to the sides, above their feet and below. */
const PAD = { side: 3.6, top: 3.6, bottom: 2.6 };
/** The camera never gets closer than this many metres wide, so a lone fighter is not a close up. */
const MIN_WIDTH = 17;
/** How far into the blast zone the frame may reach, so the edges stay in sight for KOs. */
const BLAST_INSET = 2.5;

/**
 * The box to keep in view: every fighter's feet, padded, never smaller
 * than the minimum and never past the blast zone. The main platform's
 * top is always included, so the stage stays in the shot as the fight
 * climbs.
 */
export function frameBox(points: readonly { x: number; y: number }[], stage: StageDef, minWidth = MIN_WIDTH): Box {
  const { blast } = stage;
  let x1 = Infinity;
  let x2 = -Infinity;
  let y1 = 0;
  let y2 = 0;
  for (const p of points) {
    x1 = Math.min(x1, p.x);
    x2 = Math.max(x2, p.x);
    y1 = Math.min(y1, p.y);
    y2 = Math.max(y2, p.y);
  }
  if (!Number.isFinite(x1)) {
    x1 = stage.surfaces[0]!.x1;
    x2 = stage.surfaces[0]!.x2;
  }
  const box = { x1: x1 - PAD.side, x2: x2 + PAD.side, y1: y1 - PAD.bottom, y2: y2 + PAD.top };
  const width = box.x2 - box.x1;
  if (width < minWidth) {
    const grow = (minWidth - width) / 2;
    box.x1 -= grow;
    box.x2 += grow;
  }
  box.x1 = Math.max(box.x1, blast.left + BLAST_INSET);
  box.x2 = Math.min(box.x2, blast.right - BLAST_INSET);
  box.y1 = Math.max(box.y1, blast.bottom + BLAST_INSET);
  box.y2 = Math.min(box.y2, blast.top - BLAST_INSET);
  return box;
}

/**
 * Where a camera with this vertical field of view must stand to fit the
 * box on a screen of this shape. `hidden` is the share of the screen's
 * height covered along the bottom, by the HUD cards: the box then fits
 * the part above it, and the camera looks a little lower so the box
 * sits in the middle of that part.
 */
export function fit(box: Box, fovDeg: number, aspect: number, hidden = 0): Framing {
  const tan = Math.tan((fovDeg * Math.PI) / 360);
  const open = 1 - Math.min(0.4, Math.max(0, hidden));
  const halfH = Math.max((box.y2 - box.y1) / 2 / open, (box.x2 - box.x1) / 2 / Math.max(0.3, aspect));
  const y = (box.y1 + box.y2) / 2 - (1 - open) * halfH;
  return { x: (box.x1 + box.x2) / 2, y, distance: halfH / tan };
}
