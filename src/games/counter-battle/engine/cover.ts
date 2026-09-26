import { onField, pieceDistance, TALL, type Piece } from "./arena";
import { pathBlocked, sightBlocked } from "./geometry";
import { BODY } from "./tuning";
import { dist, norm, type V2, type V3 } from "./vec";

/**
 * The places a fighter can stand to use a bunker, and the runs between
 * them. Fighters only ever travel along these runs, from one bit of cover
 * to the next, so no route leaves anyone standing in the open.
 */
export interface Spot {
  id: number;
  pos: V2;
  /** The piece this spot hides behind, or -1 for a start point. */
  piece: number;
  /** Behind tall cover a fighter hides standing and peeks round the side. */
  tall: boolean;
  /** Out from the piece's centre toward the spot. */
  out: V2;
}

export interface Edge {
  to: number;
  length: number;
}

export interface CoverGraph {
  spots: Spot[];
  edges: Edge[][];
}

/** How far from a piece's surface a fighter stands to hide behind it. */
const HUG = BODY.radius + 0.28;
/** The longest run between two spots. Short runs keep fighters out of the open. */
export const MAX_RUN = 8.5;
/** Two candidate spots closer than this are one spot. */
const MERGE = 0.7;

/** Candidate points around one piece. */
function around(piece: Piece): V2[] {
  const { shape } = piece;
  if (shape.type === "circle") {
    const r = shape.r + HUG;
    const n = shape.r > 1 ? 10 : 8;
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return { x: piece.x + Math.sin(a) * r, z: piece.z + Math.cos(a) * r };
    });
  }
  const out: V2[] = [];
  const face = (ux: number, uz: number, half: number, off: number) => {
    // Along one face at steps of about two metres, ends pulled in a little.
    const n = Math.max(1, Math.round((half * 2) / 2));
    for (let i = 0; i <= n; i++) {
      const s = n === 0 ? 0 : -half + 0.3 + ((half * 2 - 0.6) * i) / n;
      out.push({ x: piece.x + ux * off + uz * s, z: piece.z + uz * off + ux * s });
    }
  };
  face(1, 0, shape.hd, shape.hw + HUG);
  face(-1, 0, shape.hd, shape.hw + HUG);
  face(0, 1, shape.hw, shape.hd + HUG);
  face(0, -1, shape.hw, shape.hd + HUG);
  return out;
}

/** Builds the spots and runs for a field. `starts` become spots of their own. */
export function buildCover(pieces: readonly Piece[], starts: readonly V2[]): CoverGraph {
  const spots: Spot[] = [];
  const addSpot = (pos: V2, piece: Piece | null) => {
    if (!onField(pos, 0.5)) return;
    if (pieces.some((p) => pieceDistance(p, pos) < BODY.radius + 0.12)) return;
    if (spots.some((s) => dist(s.pos, pos) < MERGE)) return;
    spots.push({
      id: spots.length,
      pos,
      piece: piece?.id ?? -1,
      tall: piece !== null && piece.h >= TALL,
      out: piece ? norm({ x: pos.x - piece.x, z: pos.z - piece.z }) : { x: 0, z: 0 },
    });
  };
  for (const s of starts) addSpot(s, null);
  for (const piece of pieces) for (const p of around(piece)) addSpot(p, piece);
  const edges: Edge[][] = spots.map(() => []);
  for (let i = 0; i < spots.length; i++) {
    for (let j = i + 1; j < spots.length; j++) {
      const a = spots[i]!.pos;
      const b = spots[j]!.pos;
      const length = dist(a, b);
      if (length > MAX_RUN || pathBlocked(a, b, pieces, BODY.radius + 0.05)) continue;
      edges[i]!.push({ to: j, length });
      edges[j]!.push({ to: i, length });
    }
  }
  return { spots, edges };
}

/** The spot nearest a floor point that can be walked to in a straight line. */
export function nearestSpot(graph: CoverGraph, p: V2, pieces: readonly Piece[]): number {
  let best = 0;
  let bestD = Infinity;
  for (const s of graph.spots) {
    const d = dist(s.pos, p);
    if (d < bestD && (d < 0.3 || !pathBlocked(p, s.pos, pieces, BODY.radius))) {
      best = s.id;
      bestD = d;
    }
  }
  return best;
}

/** The height of the chest and head of someone standing or crouched. */
export function bodyPoints(p: V2, crouched: boolean): V3[] {
  const head = crouched ? BODY.crouchHead : BODY.standHead;
  const top = crouched ? BODY.crouchTop : BODY.standTop;
  return [
    { x: p.x, y: top * 0.6, z: p.z },
    { x: p.x, y: head, z: p.z },
  ];
}

/** Whether someone hiding at `p` is safe from a shooter whose eye is at `from`. */
export function hiddenFrom(p: V2, crouched: boolean, from: V3, pieces: readonly Piece[]): boolean {
  return bodyPoints(p, crouched).every((point) => sightBlocked(from, point, pieces));
}
