/** Two fighters trading shots across inflatable bunkers. A stand in until the game captures its own media. */
export function Cover() {
  return (
    <svg className="cover__art" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="counter-cover-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e1b4b" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill="url(#counter-cover-sky)" />
      <rect y="140" width="320" height="60" fill="#14532d" />
      <ellipse cx="92" cy="142" rx="34" ry="30" fill="#ff4fd8" />
      <rect x="196" y="104" width="46" height="40" rx="10" fill="#1ee3ff" />
      <rect x="148" y="122" width="22" height="22" rx="5" fill="#b8f400" />
      <circle cx="118" cy="106" r="9" fill="#fde68a" />
      <path d="M126 104L204 92" stroke="#fef9c3" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      <circle cx="220" cy="92" r="9" fill="#fde68a" />
    </svg>
  );
}
