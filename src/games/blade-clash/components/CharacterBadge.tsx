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
        <rect x="16" y="40" width="54" height="54" fill="#ff9a3c" />
        <rect x="16" y="60" width="54" height="12" fill="#2a1b4a" />
        <rect x="26" y="63" width="8" height="6" fill="#fff36b" />
        <rect x="52" y="63" width="8" height="6" fill="#fff36b" />
        <rect x="38" y="30" width="10" height="10" fill="var(--badge-trim)" />
        <rect x="16" y="86" width="54" height="8" fill="var(--badge-trim)" />
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
        <path d="M28 70 h44 v10 q-22 8 -44 0z" fill="#1b2340" />
        <path d="M50 34 l4 9 l10 1 l-8 6 l3 10 l-9 -6 l-9 6 l3 -10 l-8 -6 l10 -1z" fill="var(--badge-trim)" />
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
