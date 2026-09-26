import type { ReactNode } from "react";
import type { CharacterId } from "@/games/blade-clash/characters";

/**
 * Each fighter as a flat emblem: a head and their blade, in their own
 * colours. Small and cheap enough to draw four at once on a phone.
 */
const ART: Record<CharacterId, { sky: string; art: ReactNode }> = {
  knight: {
    sky: "#2b3a67",
    art: (
      <>
        <path d="M58 118 L96 24 L104 28 L70 122 Z" fill="#dfe6f2" />
        <path d="M52 112 h26 v8 h-26z" fill="#c9a24a" transform="rotate(22 65 116)" />
        <path d="M22 70 q0-30 28-30 q28 0 28 30 v18 h-56z" fill="#aab4c8" />
        <path d="M26 66 h48 v6 h-48z M48 44 v26" stroke="#2b3a67" strokeWidth="4" />
        <path d="M50 40 q4-14 16-18" stroke="var(--badge-trim)" strokeWidth="6" fill="none" strokeLinecap="round" />
      </>
    ),
  },
  samurai: {
    sky: "#5a1f2a",
    art: (
      <>
        <path d="M58 122 Q84 76 112 26 L116 30 Q92 80 64 124 Z" fill="#eef0f4" />
        <path d="M54 118 h18 v6 h-18z" fill="#2a2a2a" transform="rotate(-30 63 121)" />
        <path d="M20 74 q0-28 30-28 q30 0 30 28 v14 h-60z" fill="#1d1d24" />
        <path d="M14 70 q36-18 72 0" stroke="#c43b3b" strokeWidth="6" fill="none" />
        <path d="M34 50 l-10-20 M66 50 l10-20" stroke="#d8b04a" strokeWidth="5" strokeLinecap="round" />
        <path d="M30 78 h40" stroke="var(--badge-trim)" strokeWidth="5" />
      </>
    ),
  },
  block: {
    sky: "#3b2a6b",
    art: (
      <>
        <path d="M64 108 h10 v-10 h10 v-10 h10 v-10 h10 v-10 h10 v-10 h10 v10 h-10 v10 h-10 v10 h-10 v10 h-10 v10 h-10 v10 h-10z" fill="#ff5fd2" />
        <path d="M54 100 h20 v8 h-20z M60 108 h8 v14 h-8z" fill="#ffc83d" />
        <rect x="16" y="44" width="54" height="50" fill="#f0b489" />
        <rect x="12" y="34" width="62" height="12" fill="#9aa3ad" />
        <rect x="12" y="44" width="8" height="30" fill="#9aa3ad" />
        <rect x="66" y="44" width="8" height="30" fill="#9aa3ad" />
        <rect x="22" y="54" width="14" height="5" fill="#4a2c1a" />
        <rect x="50" y="54" width="14" height="5" fill="#4a2c1a" />
        <rect x="26" y="61" width="7" height="8" fill="#1e2a4a" />
        <rect x="53" y="61" width="7" height="8" fill="#1e2a4a" />
        <rect x="20" y="72" width="7" height="5" fill="var(--badge-trim)" />
        <rect x="59" y="72" width="7" height="5" fill="var(--badge-trim)" />
        <rect x="34" y="82" width="18" height="4" fill="#8a4a36" />
        <rect x="38" y="24" width="10" height="10" fill="var(--badge-trim)" />
        <rect x="30" y="18" width="9" height="9" fill="var(--badge-trim)" />
      </>
    ),
  },
  star: {
    sky: "#101a3a",
    art: (
      <>
        <path d="M64 116 L110 26" stroke="var(--badge-trim)" strokeWidth="14" strokeLinecap="round" opacity="0.35" />
        <path d="M64 116 L110 26" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <rect x="56" y="110" width="12" height="20" rx="3" fill="#b8c2d6" transform="rotate(27 62 120)" />
        <path d="M18 96 q0-56 32-56 q32 0 32 56z" fill="#e9edf5" />
        <path d="M24 82 q26 18 52 0 v14 h-52z" fill="#3a4150" />
        <path d="M22 64 q28 -8 56 0 v9 q-28 -8 -56 0z" fill="var(--badge-trim)" />
        <path d="M48 40 q2 -2 4 0 v24 h-4z" fill="#c9d1dc" />
      </>
    ),
  },
};

export function CharacterBadge({ characterId, trim, className }: { characterId: CharacterId; trim: string; className?: string }) {
  const { sky, art } = ART[characterId];
  return (
    <svg className={`character-badge ${className ?? ""}`} viewBox="0 0 130 130" role="img" aria-hidden="true" style={{ ["--badge-trim" as string]: trim }}>
      <rect width="130" height="130" rx="18" fill={sky} />
      <circle cx="96" cy="30" r="42" fill="#ffffff" opacity="0.07" />
      {art}
    </svg>
  );
}
