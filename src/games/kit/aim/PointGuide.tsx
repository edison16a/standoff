import type { Ref } from "react";
import type { AimZone } from "./aim-math";
import { TARGET_POINTS, type AimTarget } from "./aim-targets";

/** The big screen in the pictures: its box in the picture's own units. */
export const MINI_SCREEN = { x: 20, y: 10, w: 200, h: 112 } as const;

/** Where the whole screen targets sit in the picture: round the middle of the screen, drawn a little in from its edges. */
const PICTURE_MIDDLE = { x: 120, y: 58 };
const PICTURE_REACH = { x: 68 / 0.8, y: 32 / 0.8 };

/** A zone of the big screen as a box in the picture. */
export function zoneBox(zone: AimZone): { x: number; y: number; w: number; h: number } {
  return { x: MINI_SCREEN.x + zone.x * MINI_SCREEN.w, y: MINI_SCREEN.y + zone.y * MINI_SCREEN.h, w: zone.w * MINI_SCREEN.w, h: zone.h * MINI_SCREEN.h };
}

/** How far out the corner targets are drawn in a zone, a little further in than on the big screen so they fit the picture. */
const PICTURE_INSET = 0.62 / 0.8;

/** Where a target sits in the picture: fixed spots on the whole screen, or inside a player's zone. */
function targetAt(which: AimTarget, zone: AimZone | undefined): { x: number; y: number } {
  const t = TARGET_POINTS[which];
  if (!zone) return { x: PICTURE_MIDDLE.x + t.x * PICTURE_REACH.x, y: PICTURE_MIDDLE.y - t.y * PICTURE_REACH.y };
  const box = zoneBox(zone);
  return { x: box.x + ((t.x * PICTURE_INSET + 1) / 2) * box.w, y: box.y + ((1 - t.y * PICTURE_INSET) / 2) * box.h };
}

/** A player's zone drawn on the little screen, in their colour. */
export function ZoneFrame({ zone, colour }: { zone: AimZone; colour: string }) {
  const box = zoneBox(zone);
  return <rect x={box.x + 2} y={box.y + 2} width={box.w - 4} height={box.h - 4} rx="6" fill={colour} fillOpacity="0.16" stroke={colour} strokeWidth="2.5" strokeDasharray="7 4" />;
}

/** The progress ring's circumference for a target of radius r, for its dash. */
export function ringLength(r: number): number {
  return 2 * Math.PI * (r + 5);
}

interface PointGuideProps {
  target: AimTarget;
  colour: string;
  zone?: AimZone;
  /** A ring round the target that fills as the player holds still, driven straight on the SVG. */
  ringRef?: Ref<SVGCircleElement>;
  /** The reading is taken: the target turns green. */
  done?: boolean;
}

/**
 * A little picture of what to do: the big screen with the target lit up,
 * and the phone lying flat in the hand with its top edge aimed at it.
 * With a zone, the player's part of the screen is outlined and the target
 * sits inside it. A ring round the target fills while the player holds.
 */
export function PointGuide({ target: which, colour, zone, ringRef, done = false }: PointGuideProps) {
  const target = targetAt(which, zone);
  // A target in a small zone is drawn smaller, so it stays inside the outline.
  const box = zone ? zoneBox(zone) : null;
  const r = box ? Math.min(15, Math.max(6, Math.min(box.w, box.h) * 0.13)) : 15;
  const tint = done ? "var(--kit-hold-done, #2ecc71)" : colour;
  const ring = ringLength(r);
  return (
    <svg className={`kit-guide ${done ? "kit-guide--done" : ""}`} viewBox="0 0 240 230" role="img" aria-label="Point the top of your phone at the target on the big screen">
      <rect x="20" y="10" width="200" height="112" rx="10" className="kit-guide__screen" />
      {zone && <ZoneFrame zone={zone} colour={colour} />}
      <rect x="104" y="122" width="32" height="12" className="kit-guide__stand" />
      <circle cx={target.x} cy={target.y} r={r} fill="none" stroke={tint} strokeWidth="4" />
      <circle cx={target.x} cy={target.y} r={r / 3} fill={tint} />
      {ringRef && (
        <circle
          ref={ringRef}
          cx={target.x}
          cy={target.y}
          r={r + 5}
          className="kit-guide__ring"
          strokeDasharray={ring}
          strokeDashoffset={done ? 0 : ring}
          transform={`rotate(-90 ${target.x} ${target.y})`}
        />
      )}
      <line x1="120" y1="164" x2={target.x} y2={target.y + r + 1} stroke={tint} strokeWidth="3" strokeDasharray="6 6" strokeLinecap="round" />
      <g transform="translate(120 184) scale(1 0.55)">
        <rect x="-26" y="-44" width="52" height="88" rx="10" className="kit-guide__phone" />
        <rect x="-10" y="-40" width="20" height="4" rx="2" fill={colour} />
      </g>
      <text x="120" y="226" textAnchor="middle" className="kit-guide__caption">
        top edge forward, screen up
      </text>
    </svg>
  );
}
