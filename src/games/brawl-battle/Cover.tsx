/** A fighter flung off a floating stage. A stand in until the game captures its own media. */
export function Cover() {
  return (
    <svg className="cover__art" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="brawl-cover-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#ff6b35" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill="url(#brawl-cover-sky)" />
      <rect x="70" y="132" width="180" height="22" rx="8" fill="#1e1b4b" />
      <rect x="100" y="94" width="52" height="8" rx="4" fill="#fde68a" />
      <rect x="170" y="94" width="52" height="8" rx="4" fill="#fde68a" />
      <circle cx="128" cy="118" r="12" fill="#ff4757" />
      <path d="M150 112L246 62" stroke="#fef3c7" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
      <circle cx="258" cy="56" r="11" fill="#3a86ff" />
    </svg>
  );
}
