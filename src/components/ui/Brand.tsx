import { SITE } from "@/platform/site";

/**
 * Three rounded triangles in blue, pink and purple, each one overlapping
 * the last like a play button moving forward. The round corners come
 * from a thick stroke in the same colour with round joins, so the paths
 * stay three plain points each.
 */
export const MARK_SHAPES = [
  { colour: "#2d8cff", path: "M85 317 159 789 590 476Z" },
  { colour: "#f5145f", path: "M288 299 362 775 796 462Z" },
  { colour: "#a855f7", path: "M500 299 574 775 1008 462Z" },
] as const;

/** The mark's outer edge, stroke included, so it sits flush in its box. */
export const MARK_VIEWBOX = "44 258 1004 575";
export const MARK_STROKE = 68;

export function StandoffMark() {
  return (
    <svg viewBox={MARK_VIEWBOX} strokeWidth={MARK_STROKE} strokeLinejoin="round" aria-hidden="true">
      {MARK_SHAPES.map((shape) => (
        <path key={shape.colour} d={shape.path} fill={shape.colour} stroke={shape.colour} />
      ))}
    </svg>
  );
}

export function Brand() {
  return (
    <span className="brand">
      <StandoffMark />
      {SITE.name}
    </span>
  );
}
