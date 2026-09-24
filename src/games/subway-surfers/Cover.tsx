/** Three rail lanes running into the distance. A stand in until the game captures its own media. */
export function Cover() {
  return (
    <svg className="cover__art" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="320" height="200" fill="#7cc8ff" />
      <path d="M0 120H320V200H0Z" fill="#8a8f98" />
      <path d="M150 120 40 200M160 120 160 200M170 120 280 200" stroke="#f4f4f4" strokeWidth="6" />
      <rect x="196" y="126" width="40" height="30" rx="4" fill="#eab308" />
      <circle cx="120" cy="150" r="12" fill="#ff4757" />
    </svg>
  );
}
