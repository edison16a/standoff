import type { AimZone } from "./aim-math";
import type { AimStep } from "./protocol";

const TARGET_AT: Record<"center" | "top-left" | "bottom-right", { x: number; y: number }> = {
  center: { x: 120, y: 58 },
  "top-left": { x: 52, y: 26 },
  "bottom-right": { x: 188, y: 90 },
};

/** The big screen in the pictures: its box in the picture's own units. */
export const MINI_SCREEN = { x: 20, y: 10, w: 200, h: 112 } as const;

/** A zone of the big screen as a box in the picture. */
export function zoneBox(zone: AimZone): { x: number; y: number; w: number; h: number } {
  return { x: MINI_SCREEN.x + zone.x * MINI_SCREEN.w, y: MINI_SCREEN.y + zone.y * MINI_SCREEN.h, w: zone.w * MINI_SCREEN.w, h: zone.h * MINI_SCREEN.h };
}

/** How far out the corner targets are drawn in a zone, a little further in than on the big screen so they fit the picture. */
const PICTURE_INSET = 0.62;

/** Where a target sits in the picture: fixed spots on the whole screen, or inside a player's zone. */
function targetAt(which: keyof typeof TARGET_AT, zone: AimZone | undefined): { x: number; y: number } {
  if (!zone) return TARGET_AT[which];
  const box = zoneBox(zone);
  const s = which === "center" ? 0 : which === "top-left" ? -PICTURE_INSET : PICTURE_INSET;
  return { x: box.x + ((s + 1) / 2) * box.w, y: box.y + ((s + 1) / 2) * box.h };
}

/** A player's zone drawn on the little screen, in their colour. */
export function ZoneFrame({ zone, colour }: { zone: AimZone; colour: string }) {
  const box = zoneBox(zone);
  return <rect x={box.x + 2} y={box.y + 2} width={box.w - 4} height={box.h - 4} rx="6" fill={colour} fillOpacity="0.16" stroke={colour} strokeWidth="2.5" strokeDasharray="7 4" />;
}

/**
 * A little picture of what to do: the big screen with the target lit up,
 * and the phone lying flat in the hand with its top edge aimed at it.
 * With a zone, the player's part of the screen is outlined and the target
 * sits inside it.
 */
export function PointGuide({ step, colour, zone }: { step: AimStep; colour: string; zone?: AimZone }) {
  const target = targetAt(step === "top-left" || step === "bottom-right" ? step : "center", zone);
  // A target in a small zone is drawn smaller, so it stays inside the outline.
  const box = zone ? zoneBox(zone) : null;
  const r = box ? Math.min(15, Math.max(6, Math.min(box.w, box.h) * 0.13)) : 15;
  return (
    <svg className="kit-guide" viewBox="0 0 240 230" role="img" aria-label="Point the top of your phone at the target on the big screen">
      <rect x="20" y="10" width="200" height="112" rx="10" className="kit-guide__screen" />
      {zone && <ZoneFrame zone={zone} colour={colour} />}
      <rect x="104" y="122" width="32" height="12" className="kit-guide__stand" />
      <circle cx={target.x} cy={target.y} r={r} fill="none" stroke={colour} strokeWidth="4" />
      <circle cx={target.x} cy={target.y} r={r / 3} fill={colour} />
      <line x1="120" y1="164" x2={target.x} y2={target.y + r + 1} stroke={colour} strokeWidth="3" strokeDasharray="6 6" strokeLinecap="round" />
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
