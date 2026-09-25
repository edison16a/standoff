/** Bold button icons for the controller, drawn to read at a glance. */

export function ShootIcon() {
  return (
    <svg className="nba-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M8 14h32M12 14l4 14h16l4-14" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M16 28l3 10M24 28v10M32 28l-3 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="7" r="5" fill="currentColor" />
    </svg>
  );
}

export function PassIcon() {
  return (
    <svg className="nba-icon" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="11" cy="24" r="6" fill="currentColor" />
      <path d="M20 24h20M32 16l8 8-8 8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CallIcon() {
  return (
    <svg className="nba-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 42V20M14 28l10-10 10 10" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 10a10 10 0 0 1 14 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function BlockIcon() {
  return (
    <svg className="nba-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M14 44V22c0-2 3-2 3 0v-10c0-2 3-2 3 0v-4c0-2 3-2 3 0v4c0-2 3-2 3 0v6c0-2 3-2 3 0v12c0 6-3 10-6 14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 8l6-4M36 14h7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function StealIcon() {
  return (
    <svg className="nba-icon" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="31" cy="30" r="8" fill="currentColor" />
      <path d="M6 18c8-6 18-6 26 0M24 10l8 8-10 2" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
