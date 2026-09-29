import type { GunId } from "../engine/guns";

/**
 * Each gun's side view as a flat silhouette, pointing right: in the kill
 * feed, on the lobby's cards and on the phone's gun pick. Drawn in the
 * current text colour, so it takes whatever colour sits around it.
 */
/** A paint hopper sitting on the receiver, its left edge at `x`. */
const hopper = (x: number) => `M${x} 7.5v-4a4 3 0 0 1 4-3.5h4a4 3 0 0 1 4 3.5v4z`;

const SHAPES: Record<GunId, string> = {
  // Tank stock, receiver with a hopper, curved magazine, handguard and a long barrel.
  rifle: `M2 9h9l3-2h20v-1h4v1h10v2h14v2H48v3h-9l-2 1h-3l2 6-4 1-3-7h-3l-1 3h-4l1-3h-6l-5 4H4l-2-4z${hopper(20)}`,
  // Tank stock, receiver with a small hopper, pump under a long barrel.
  shotgun: `M2 10l12-2h14v-1h34v3H40v2h12v3H38v-1h-8l-2 1h-6l-4 4H6l-4-3z${hopper(18)}`,
  // Short tank, short body with a hopper, long straight magazine, stubby barrel.
  smg: `M8 8h4v2h2l2-2h18v-1h3v1h11v2h-11v3h-8l-2 1h-4l1 8h-4l-1-8h-4l-2 3h-5l1-4H8z${hopper(19)}`,
  // Stock with a cheek rest, scope on top, very long barrel.
  sniper: "M2 11l10-3h6v-3h14v-1h3v1h1v3h-1v1h27v2H40v2H28l-3 2h-5l-3 4H6l-4-3zM20 5h10v2H20z",
};

export function GunIcon({ gun, size = 48, className }: { gun: GunId; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={(size * 24) / 64} viewBox="0 0 64 24" aria-hidden="true">
      <path d={SHAPES[gun]} fill="currentColor" />
    </svg>
  );
}
