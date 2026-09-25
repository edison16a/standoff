/** Three glowing rails running into a neon night. A stand in until the game captures its own media. */
export function Cover() {
  return (
    <svg className="cover__art" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="320" height="200" fill="#12082e" />
      <rect y="90" width="320" height="30" fill="#5a1a7a" />
      <path d="M0 120H320V200H0Z" fill="#1c1630" />
      <path d="M150 120 40 200M160 120 160 200M170 120 280 200" stroke="#21f3ff" strokeWidth="5" />
      <rect x="196" y="126" width="40" height="30" rx="4" fill="#ff2bd6" />
      <circle cx="120" cy="150" r="12" fill="#ffd21f" />
    </svg>
  );
}
