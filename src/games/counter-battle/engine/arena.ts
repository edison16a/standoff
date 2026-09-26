import type { V2 } from "./vec";

/**
 * The field, laid out like a pro paintball field: inflatable bunkers of a
 * few set shapes, a snake along one side, towers and barrel stacks. Team
 * 0's half is written out once and turned half a circle about the centre
 * for the other half, so both sides get the same field.
 *
 * x runs across the field, z along it. Side 0's base is at -z.
 */
export const PIECE_KINDS = ["can", "dorito", "cake", "brick", "snake", "tower", "barrel", "wall"] as const;
export type PieceKind = (typeof PIECE_KINDS)[number];

export type Shape = { type: "circle"; r: number } | { type: "box"; hw: number; hd: number };

export interface Piece {
  id: number;
  kind: PieceKind;
  x: number;
  z: number;
  shape: Shape;
  /** Height in metres. Under 1.6 is low cover: stand to see over, crouch to hide. */
  h: number;
}

export const FIELD = { halfWidth: 16, halfLength: 27 } as const;

/** Anything this tall hides a standing fighter; lower cover needs a crouch. */
export const TALL = 1.6;

/** The shape and height each kind comes in. */
const KINDS: Record<PieceKind, { shape: Shape; h: number }> = {
  can: { shape: { type: "circle", r: 0.75 }, h: 1.85 },
  dorito: { shape: { type: "circle", r: 0.8 }, h: 1.2 },
  cake: { shape: { type: "circle", r: 1.2 }, h: 1.25 },
  brick: { shape: { type: "box", hw: 0.95, hd: 0.55 }, h: 1.15 },
  snake: { shape: { type: "box", hw: 0.45, hd: 4 }, h: 1.1 },
  tower: { shape: { type: "box", hw: 1, hd: 1 }, h: 2.7 },
  barrel: { shape: { type: "circle", r: 0.4 }, h: 1.15 },
  wall: { shape: { type: "box", hw: 1.6, hd: 0.25 }, h: 2.2 },
};

type Place = [PieceKind, number, number, Shape?];

/** Side 0's half, back to front. Everything here is mirrored for side 1. */
const HALF: readonly Place[] = [
  ["wall", 0, -22.5],
  ["can", -9, -19.5],
  ["can", 9, -19],
  ["dorito", -4, -17],
  ["dorito", 4.5, -15.5],
  ["brick", -12, -13],
  ["cake", 0, -12.5],
  ["tower", 10, -9.5],
  ["barrel", 6, -11.5],
  ["barrel", 6.9, -12.2],
  ["snake", -13.6, -6],
  ["wall", -6.5, -8, { type: "box", hw: 0.25, hd: 1.6 }],
  ["dorito", -9.5, -3],
  ["can", 5, -4.5],
  ["brick", 13, -3.5],
  ["barrel", 2.8, -1.8],
];

/** Pieces that sit on the centre point and so are their own mirror image. */
const CENTRE: readonly Place[] = [["cake", 0, 0, { type: "circle", r: 1.3 }]];

function build(): Piece[] {
  const pieces: Piece[] = [];
  const add = ([kind, x, z, shape]: Place) => {
    pieces.push({ id: pieces.length, kind, x, z, shape: shape ?? KINDS[kind].shape, h: KINDS[kind].h });
  };
  for (const place of HALF) add(place);
  // Half a turn about the centre: a box keeps its extents, a circle its radius.
  for (const [kind, x, z, shape] of HALF) add([kind, -x, -z, shape]);
  for (const place of CENTRE) add(place);
  return pieces;
}

export const PIECES: readonly Piece[] = build();

/** Start points for each side, one per team slot. */
const SPAWN_HALF: readonly V2[] = [
  { x: -3.2, z: -25 },
  { x: 3.2, z: -25 },
];

/** Where a team starts when it plays from `side`. A lone fighter starts in the middle. */
export function spawnPoints(side: 0 | 1, count: number): V2[] {
  const base = count === 1 ? [{ x: 0, z: -25 }] : SPAWN_HALF.slice(0, count);
  return base.map((p) => (side === 0 ? { ...p } : { x: -p.x, z: -p.z }));
}

/** The middle of a side's back line, where its fighters come from. */
export function baseOf(side: 0 | 1): V2 {
  return { x: 0, z: side === 0 ? -FIELD.halfLength : FIELD.halfLength };
}

/** Whether a floor point is on the field with `margin` to spare. */
export function onField(p: V2, margin = 0): boolean {
  return Math.abs(p.x) <= FIELD.halfWidth - margin && Math.abs(p.z) <= FIELD.halfLength - margin;
}

/** The nearest distance from a floor point to a piece's footprint (negative inside). */
export function pieceDistance(piece: Piece, p: V2): number {
  const dx = p.x - piece.x;
  const dz = p.z - piece.z;
  if (piece.shape.type === "circle") return Math.hypot(dx, dz) - piece.shape.r;
  const qx = Math.abs(dx) - piece.shape.hw;
  const qz = Math.abs(dz) - piece.shape.hd;
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qz, 0));
  return outside + Math.min(Math.max(qx, qz), 0);
}
