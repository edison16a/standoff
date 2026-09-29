import type { PowerKind } from "../../engine/types";

/** Small drawn icons for the HUD, in the power ups' own colours. */
export function PowerIcon({ kind }: { kind: PowerKind }) {
  switch (kind) {
    case "boots":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M8 6h9v11l8 3c2 1 3 2 3 4v2H6V8z" fill="#3ddc84" stroke="#0d4f2b" strokeWidth="2" strokeLinejoin="round" />
          <path d="M6 26h22v2H6z" fill="#fff" />
          <path d="M3 12l3-2M2 17h4M3 22l3-1" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "hoverboard":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <rect x="3" y="12" width="26" height="7" rx="3.5" fill="#4db8ff" stroke="#0b3a66" strokeWidth="2" />
          <path d="M8 15.5h16" stroke="#ff4db8" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="10" cy="24" rx="4" ry="1.6" fill="#7ff3ff" />
          <ellipse cx="22" cy="24" rx="4" ry="1.6" fill="#7ff3ff" />
        </svg>
      );
    case "magnet":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M7 5v11a9 9 0 0 0 18 0V5h-6v11a3 3 0 0 1-6 0V5z" fill="#ff4d5e" stroke="#6b0f18" strokeWidth="2" strokeLinejoin="round" />
          <path d="M7 5h6v5H7zM19 5h6v5h-6z" fill="#e9edf3" />
        </svg>
      );
    case "double":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M16 2l3.6 7.4 8.1 1.2-5.9 5.7 1.4 8.1L16 20.6l-7.2 3.8 1.4-8.1-5.9-5.7 8.1-1.2z" fill="#ffd21f" stroke="#8a4b00" strokeWidth="2" strokeLinejoin="round" />
          <text x="16" y="17.5" textAnchor="middle" fontSize="8" fontWeight="900" fill="#8a2b00" fontFamily="Arial Black, sans-serif">2X</text>
        </svg>
      );
    case "jetpack":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <rect x="7" y="4" width="7" height="16" rx="3.5" fill="#ff8a1f" stroke="#6b2f00" strokeWidth="2" />
          <rect x="18" y="4" width="7" height="16" rx="3.5" fill="#ff8a1f" stroke="#6b2f00" strokeWidth="2" />
          <path d="M8.5 22l2 7 2-7zM19.5 22l2 7 2-7z" fill="#ffe14d" />
        </svg>
      );
  }
}

export function CoinIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="#ffc629" stroke="#8a4b00" strokeWidth="2.5" />
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="#ffe79a" strokeWidth="2" />
      <path d="M13 11l-2 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Camera or keyboard, for the lobby's choice of how to play. Line art in the text colour. */
export function ModeIcon({ mode }: { mode: "camera" | "keyboard" }) {
  if (mode === "camera") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect x="3" y="9" width="20" height="15" rx="4" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M23 14l6-4v13l-6-4z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="2" y="8" width="28" height="17" rx="4" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M8 13h2M13 13h2M18 13h2M23 13h2M10 19h12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
