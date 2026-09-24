import type { ItemKind } from "../engine/items";

/**
 * Magic Kart's own pictures for the controller: the pedals, the wheel
 * and one icon per power up. Big, simple and filled, so they read in a
 * glance at arm's length while racing.
 */

export function DriveIcon() {
  return (
    <svg viewBox="0 0 48 48" className="mk-icon" aria-hidden="true">
      <path d="M24 5 41 25H31v18H17V25H7z" fill="currentColor" />
    </svg>
  );
}

export function BrakeIcon() {
  return (
    <svg viewBox="0 0 48 48" className="mk-icon" aria-hidden="true">
      <path d="M17 4h14l10 10v14L31 38H17L7 28V14z" fill="currentColor" />
      <rect x="13" y="18" width="22" height="6" rx="2" fill="var(--mk-brake-ink, #7a1020)" />
    </svg>
  );
}

export function WheelIcon() {
  return (
    <svg viewBox="0 0 48 48" className="mk-icon" aria-hidden="true">
      <circle cx="24" cy="24" r="19" fill="none" stroke="currentColor" strokeWidth="5" />
      <circle cx="24" cy="24" r="5" fill="currentColor" />
      <path d="M6 22h13M29 22h13M24 29v14" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/** An empty item slot: the outline of a power up cube with a question mark. */
export function CubeGlyph() {
  return (
    <svg viewBox="0 0 48 48" className="mk-icon mk-icon--cube" aria-hidden="true">
      <path d="M24 5 41 14.5v19L24 43 7 33.5v-19z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" opacity="0.55" />
      <path d="M19 19.5a5 5 0 1 1 7 4.6c-1.3.6-2 1.5-2 2.9v1.5" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="24" cy="33.5" r="2.1" fill="currentColor" />
    </svg>
  );
}

const STAR = "M24 4l5.9 12.6 13.6 1.6-10 9.3 2.6 13.5L24 34.3 11.9 41l2.6-13.5-10-9.3 13.6-1.6z";

export function ItemIcon({ item }: { item: ItemKind }) {
  switch (item) {
    case "orb":
      return (
        <svg viewBox="0 0 48 48" className="mk-icon" aria-hidden="true">
          <circle cx="24" cy="24" r="20" fill="#ffb31a" />
          <path d={STAR} fill="#fff" transform="translate(6 6) scale(0.75)" />
        </svg>
      );
    case "nitro":
      return (
        <svg viewBox="0 0 48 48" className="mk-icon" aria-hidden="true">
          <path d="M24 3c6 9 13 14 13 25a13 13 0 0 1-26 0c0-6 3-10 6-13 0 5 2 8 5 9-1-8 0-14 2-21z" fill="#ff5a1f" />
          <path d="M24 22c3 5 6 7 6 12a6 6 0 0 1-12 0c0-3 2-6 6-12z" fill="#ffe14d" />
        </svg>
      );
    case "ice":
      return (
        <svg viewBox="0 0 48 48" className="mk-icon" aria-hidden="true">
          <path d="M24 3v42M6 13.5l36 21M6 34.5l36-21" stroke="#7fe3ff" strokeWidth="5" strokeLinecap="round" />
          <path d="M18 7l6 5 6-5M18 41l6-5 6 5M5 21l8-1-3-7M43 27l-8 1 3 7M5 27l8 1-3 7M43 21l-8-1 3-7" stroke="#d6f7ff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "ghost":
      return (
        <svg viewBox="0 0 48 48" className="mk-icon" aria-hidden="true">
          <path d="M24 4c-9 0-15 7-15 16v22l5-4 5 4 5-4 5 4 5-4 5 4V20c0-9-6-16-15-16z" fill="#e8e2ff" opacity="0.9" />
          <circle cx="18" cy="20" r="3.5" fill="#4b3a8f" />
          <circle cx="30" cy="20" r="3.5" fill="#4b3a8f" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 48 48" className="mk-icon" aria-hidden="true">
          <path d="M24 3 41 9v13c0 11-7 19-17 23C14 41 7 33 7 22V9z" fill="#3fd6a8" />
          <path d="M24 9l11 4v9c0 7-4 13-11 16z" fill="#b6ffe8" opacity="0.8" />
        </svg>
      );
  }
}
