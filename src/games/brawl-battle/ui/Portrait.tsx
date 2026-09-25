import type { ReactNode } from "react";
import type { CharacterId } from "../roster";

const SKIN = "#e9b384";
const INK = "#1b1426";

/** Each fighter's face, drawn on a 64 unit square, head and shoulders. */
const FACES: Record<CharacterId, ReactNode> = {
  karate: (
    <>
      <path d="M14 64c2-12 9-17 18-17s16 5 18 17z" fill="#f8fafc" />
      <path d="M26 47l6 10 6-10" fill="none" stroke={INK} strokeWidth="2" />
      <circle cx="32" cy="32" r="14" fill={SKIN} />
      <path d="M17 26l4-12 5 6 3-9 5 7 5-8 3 9 6-4-2 12z" fill={INK} />
      <rect x="17" y="23" width="30" height="5" rx="2" fill="#dc2626" />
      <path d="M46 25l10-3-4 6 6 3-12-1z" fill="#dc2626" />
      <path d="M24 32l6 2M40 32l-6 2" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M28 40h8" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  samurai: (
    <>
      <path d="M12 64c2-12 10-17 20-17s18 5 20 17z" fill="#b91c1c" />
      <path d="M20 50h24" stroke="#fbbf24" strokeWidth="2.5" />
      <circle cx="32" cy="33" r="13" fill={SKIN} />
      <path d="M16 31c0-12 7-18 16-18s16 6 16 18z" fill="#dc2626" />
      <path d="M14 30h36l-3 5H17z" fill="#991b1b" />
      <path d="M32 18c-6-6-14-8-18-6 5 1 9 5 12 10zM32 18c6-6 14-8 18-6-5 1-9 5-12 10z" fill="#fbbf24" />
      <path d="M20 39h24v9c-4 3-8 4-12 4s-8-1-12-4z" fill={INK} />
      <path d="M25 36h5M34 36h5" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
    </>
  ),
  mage: (
    <>
      <path d="M12 64c2-12 10-17 20-17s18 5 20 17z" fill="#6d28d9" />
      <circle cx="32" cy="35" r="12" fill={SKIN} />
      <path d="M21 38c2 12 7 18 11 18s9-6 11-18c-4 3-7 4-11 4s-7-1-11-4z" fill="#f1f5f9" />
      <path d="M32 2L20 28h24z" fill="#7c3aed" />
      <path d="M13 29c5-3 12-4 19-4s14 1 19 4c-5 2-12 3-19 3s-14-1-19-3z" fill="#5b21b6" />
      <path d="M32 11l1.6 3.4 3.7.4-2.8 2.5.8 3.7-3.3-1.9-3.3 1.9.8-3.7-2.8-2.5 3.7-.4z" fill="#fde047" />
      <circle cx="27" cy="35" r="1.8" fill={INK} />
      <circle cx="37" cy="35" r="1.8" fill={INK} />
    </>
  ),
  bear: (
    <>
      <path d="M8 64c2-14 11-20 24-20s22 6 24 20z" fill="#7c2d12" />
      <rect x="18" y="52" width="28" height="6" rx="2" fill="#fbbf24" />
      <circle cx="17" cy="17" r="7" fill="#92400e" />
      <circle cx="47" cy="17" r="7" fill="#92400e" />
      <circle cx="17" cy="17" r="3.5" fill="#d6a36b" />
      <circle cx="47" cy="17" r="3.5" fill="#d6a36b" />
      <circle cx="32" cy="31" r="17" fill="#92400e" />
      <ellipse cx="32" cy="38" rx="9" ry="7" fill="#d6a36b" />
      <ellipse cx="32" cy="35" rx="3.6" ry="2.6" fill={INK} />
      <path d="M32 38v3M28 42c2 2 6 2 8 0" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M22 26l5 2M42 26l-5 2" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
};

interface PortraitProps {
  character: CharacterId;
  /** The ring and background, usually the player's colour. */
  colour: string;
  size?: number;
  className?: string;
}

/** A fighter's face in a round frame of the player's colour, for the HUD, the lobby and the phone. */
export function Portrait({ character, colour, size = 56, className }: PortraitProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <clipPath id={`bb-portrait-${character}`}>
          <circle cx="32" cy="32" r="30" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="31" fill={colour} />
      <g clipPath={`url(#bb-portrait-${character})`}>
        <circle cx="32" cy="32" r="30" fill="rgba(255,255,255,0.18)" />
        {FACES[character]}
      </g>
      <circle cx="32" cy="32" r="30" fill="none" stroke="#ffffff" strokeWidth="2.5" />
    </svg>
  );
}
