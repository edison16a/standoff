import "./calibrate.css";
import type { ReactNode } from "react";
import type { AimZone, ScreenPoint } from "../aim-math";

/** The big screen in miniature: 16 by 9, in the picture's own units. */
export const TV = { x: 10, y: 10, w: 300, h: 169 } as const;

/** A zone of the big screen as a box in the picture. */
export function tvBox(zone: AimZone): { x: number; y: number; w: number; h: number } {
  return { x: TV.x + zone.x * TV.w, y: TV.y + zone.y * TV.h, w: zone.w * TV.w, h: zone.h * TV.h };
}

/** Where a point of a zone, x and y from -1 to 1 with y up, sits in the picture. The big screen places it the same way. */
export function tvPoint(point: ScreenPoint, zone: AimZone): { x: number; y: number } {
  const box = tvBox(zone);
  return { x: box.x + ((point.x + 1) / 2) * box.w, y: box.y + ((1 - point.y) / 2) * box.h };
}

/** The edges of a zone that cross the screen, so the picture splits the views as the big screen does. */
function splits(zone: AimZone): string {
  const box = tvBox(zone);
  const lines: string[] = [];
  if (zone.x > 0) lines.push(`M${box.x} ${TV.y}V${TV.y + TV.h}`);
  if (zone.x + zone.w < 1) lines.push(`M${box.x + box.w} ${TV.y}V${TV.y + TV.h}`);
  if (zone.y > 0) lines.push(`M${TV.x} ${box.y}H${TV.x + TV.w}`);
  if (zone.y + zone.h < 1) lines.push(`M${TV.x} ${box.y + box.h}H${TV.x + TV.w}`);
  return lines.join("");
}

interface TvPictureProps {
  /** The player's part of the big screen, lit in their colour. */
  zone: AimZone;
  colour: string;
  label: string;
  children: ReactNode;
}

/** The big screen in miniature, with the player's part of it lit in their colour and whatever is drawn on it. */
export function TvPicture({ zone, colour, label, children }: TvPictureProps) {
  const box = tvBox(zone);
  const split = splits(zone);
  return (
    <svg className="kit-tv" viewBox="0 0 320 189" role="img" aria-label={label}>
      <rect x={TV.x - 4} y={TV.y - 4} width={TV.w + 8} height={TV.h + 8} rx="10" className="kit-tv__frame" />
      <rect x={TV.x} y={TV.y} width={TV.w} height={TV.h} rx="5" className="kit-tv__screen" />
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="5" className="kit-tv__zone" style={{ fill: colour }} />
      {split && <path d={split} className="kit-tv__split" />}
      {children}
    </svg>
  );
}

/** The player's live aim on the miniature screen, for the page that checks it follows. */
export function LiveDot({ point, zone, colour }: { point: ScreenPoint; zone: AimZone; colour: string }) {
  const at = tvPoint({ x: Math.max(-1, Math.min(1, point.x)), y: Math.max(-1, Math.min(1, point.y)) }, zone);
  return (
    <TvPicture zone={zone} colour={colour} label="Your aim on the big screen">
      <circle cx={at.x} cy={at.y} r="14" className="kit-tv__glow" style={{ fill: colour }} />
      <circle cx={at.x} cy={at.y} r="9" className="kit-tv__ring" style={{ stroke: colour }} />
      <circle cx={at.x} cy={at.y} r="4" className="kit-tv__core" />
    </TvPicture>
  );
}
