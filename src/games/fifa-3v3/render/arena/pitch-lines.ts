import { PITCH } from "../../engine/tuning";

/** A straight line from (ax, az) to (bx, bz), in metres on the pitch. */
export interface Segment {
  ax: number;
  az: number;
  bx: number;
  bz: number;
}

/** A circle of radius r round (x, z). Filled ones are spots; open ones are drawn as a line. */
export interface Ring {
  x: number;
  z: number;
  r: number;
  filled: boolean;
}

/** Line width in metres: twelve centimetres, as on a real pitch. */
export const LINE_WIDTH = 0.12;
/** The touchlines sit just inside the boards; the goal lines run through the posts. */
export const LINE_INSET = { end: 0.05, side: 0.3 };

/**
 * The markings of the pitch as shapes, for the turf's shader to draw
 * exactly at any distance: the boundary, the halfway line, the centre
 * circle and spot, each keeper's half circle (a whole circle clipped to
 * the field of play), the penalty spots and the corner arcs.
 */
export function pitchLines(): { segments: Segment[]; rings: Ring[]; field: { x: number; z: number } } {
  const x = PITCH.halfLength - LINE_INSET.end;
  const z = PITCH.halfWidth - LINE_INSET.side;
  const segments: Segment[] = [
    { ax: -x, az: -z, bx: x, bz: -z },
    { ax: -x, az: z, bx: x, bz: z },
    { ax: -x, az: -z, bx: -x, bz: z },
    { ax: x, az: -z, bx: x, bz: z },
    { ax: 0, az: -z, bx: 0, bz: z },
  ];
  const rings: Ring[] = [
    { x: 0, z: 0, r: PITCH.centreRadius, filled: false },
    { x: 0, z: 0, r: 0.16, filled: true },
  ];
  for (const end of [-1, 1]) {
    rings.push({ x: end * x, z: 0, r: PITCH.boxRadius, filled: false });
    rings.push({ x: end * (PITCH.halfLength - PITCH.penaltySpot), z: 0, r: 0.11, filled: true });
    for (const side of [-1, 1]) rings.push({ x: end * x, z: side * z, r: 0.6, filled: false });
  }
  return { segments, rings, field: { x, z } };
}
