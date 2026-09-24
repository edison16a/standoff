/**
 * Everything that can be shot, and what it is worth. Small and fast
 * things pay more, so a good shot is rewarded for picking them off.
 */

export const TARGET_KINDS = ["duck", "duckling", "golden", "bullseye", "plate"] as const;
export type TargetKind = (typeof TARGET_KINDS)[number];

/** An ellipse on the target's face, relative to its hinge, for a duck facing right. */
export interface HitShape {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

export interface KindInfo {
  points: number;
  /** Size relative to the standard model. The hit shapes are scaled by it too. */
  scale: number;
  shapes: readonly HitShape[];
  /** Hits inside this radius of the first shape's centre score `bullPoints` instead. */
  bullRadius?: number;
  bullPoints?: number;
}

/** A rubber duck's body and head, standing on its hinge. */
const DUCK_SHAPES: readonly HitShape[] = [
  { x: -0.03, y: 0.25, rx: 0.36, ry: 0.22 },
  { x: 0.2, y: 0.54, rx: 0.15, ry: 0.15 },
];

/** Bullseye faces sit on a stick, so their centre is well above the hinge. */
export const BULLSEYE_RADIUS = 0.36;
export const BULLSEYE_CENTER_Y = 0.78;
export const PLATE_RADIUS = 0.17;
export const PLATE_CENTER_Y = -0.26;

export const KINDS: Record<TargetKind, KindInfo> = {
  duck: { points: 10, scale: 1, shapes: DUCK_SHAPES },
  duckling: { points: 25, scale: 0.62, shapes: DUCK_SHAPES },
  golden: { points: 50, scale: 0.82, shapes: DUCK_SHAPES },
  bullseye: {
    points: 15,
    scale: 1,
    shapes: [{ x: 0, y: BULLSEYE_CENTER_Y, rx: BULLSEYE_RADIUS, ry: BULLSEYE_RADIUS }],
    bullRadius: 0.085,
    bullPoints: 40,
  },
  // Plates hang below the rail, so their centre is under the hinge.
  plate: { points: 30, scale: 1, shapes: [{ x: 0, y: PLATE_CENTER_Y, rx: PLATE_RADIUS, ry: PLATE_RADIUS }] },
};

export function isDuck(kind: TargetKind): boolean {
  return kind === "duck" || kind === "duckling" || kind === "golden";
}
