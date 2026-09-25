import { SEGMENTS, type Segment } from "../../engine/route";

/** A block narrower than this would read as a gap, so the one before it stretches instead. */
export const MIN_BLOCK = 4;

export interface RowSpan {
  from: number;
  to: number;
  /** True when the row must stop exactly at `to`, not just start its last block before it. */
  fit: boolean;
}

const straightOn = (seg: Segment, other: Segment | undefined) => !!other && Math.abs(other.heading - seg.heading) < 1e-3;

/**
 * Where a row of blocks down one side may run. A segment that carries
 * straight on from its neighbour shares that neighbour's walls, and each
 * builds its own row, so rows that ran past the shared edge doubled up
 * and their fronts flickered through each other. Those ends stop at the
 * edge, half a gap short. Ends at a corner keep running past it, which
 * fills the corner.
 */
export function rowSpan(seg: Segment, a0: number, a1: number, gap: number): RowSpan {
  const prev = SEGMENTS[seg.index - 2];
  const next = SEGMENTS[seg.index];
  const into = straightOn(seg, next);
  return {
    from: straightOn(seg, prev) ? Math.max(a0, gap / 2) : a0,
    to: into ? Math.min(a1, seg.length - gap / 2) : a1,
    fit: into,
  };
}

/** The width of the block starting at `along`, cut or stretched so the row ends on `span.to` when it must. */
export function fitBlock(span: RowSpan, along: number, w: number, gap: number): number {
  if (!span.fit) return w;
  const left = span.to - along;
  return left - w - gap < MIN_BLOCK ? left : w;
}
