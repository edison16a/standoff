import { SITE } from "@/shared/site";

/** Two crossed blades. The mark in the top bar and the favicon. */
export function StandoffMark() {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
      <path d="M6 26 24 8M8 6l18 18" />
      <path d="M4 22l6 6M22 26l6-6" />
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
