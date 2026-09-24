import { SITE } from "@/platform/site";

/**
 * One broad sword, point up, as a flat accent silhouette. The fuller down
 * the blade is cut out of the blade shape (even-odd fill), so the mark
 * stays one colour at any size, favicon included. The hilt is a separate
 * shape because its overlapping pieces must fill normally.
 */
export const SWORD_BLADE = "M16 1 20.8 5.8V19.6H11.2V5.8ZM15.25 7.4V17.2H16.75V7.4Z";
export const SWORD_HILT =
  "M6.2 19.6H25.8A1.9 1.9 0 0 1 27.7 21.5V21.9A1.9 1.9 0 0 1 25.8 23.8H6.2A1.9 1.9 0 0 1 4.3 21.9V21.5A1.9 1.9 0 0 1 6.2 19.6ZM13.8 23.5H18.2V27.2H13.8ZM16 25.6A2.75 2.75 0 1 1 16 31.1A2.75 2.75 0 1 1 16 25.6Z";

export function StandoffMark() {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
      <path d={SWORD_BLADE} fillRule="evenodd" />
      <path d={SWORD_HILT} />
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
