/** Inflatable bunkers splattered in both teams' paint. A stand in until the game captures its own media. */
export function Cover() {
  return (
    <svg className="cover__art" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="paintball-cover-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e1b4b" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill="url(#paintball-cover-sky)" />
      <rect y="140" width="320" height="60" fill="#14532d" />
      <ellipse cx="92" cy="142" rx="34" ry="30" fill="#2b2f45" />
      <rect x="196" y="104" width="46" height="40" rx="10" fill="#2b2f45" />
      <rect x="148" y="122" width="22" height="22" rx="5" fill="#b8f400" />
      {/* Splats: a round blob with drops, and drips running down the walls. */}
      <path d="M78 124c6-7 17-5 20 2 5 1 7 7 3 11 1 6-6 9-10 6l-1 12-3-1-1-10c-6 2-11-2-9-7-5-3-4-11 1-13z" fill="#ff3fc8" />
      <circle cx="108" cy="122" r="2.5" fill="#ff3fc8" />
      <circle cx="70" cy="140" r="2" fill="#ff3fc8" />
      <path d="M205 112c5-6 15-4 17 2 5 0 6 7 2 9l-2 14-3-1 0-11c-5 3-11 0-10-5-5-2-6-7-4-8z" fill="#16d9ff" />
      <circle cx="230" cy="110" r="2.2" fill="#16d9ff" />
      <path d="M140 170c6-3 14-1 15 4 4 2 2 8-3 7-3 4-11 3-12-2-4-1-4-7 0-9z" fill="#ff3fc8" opacity="0.85" />
      <circle cx="118" cy="104" r="8" fill="#ff3fc8" />
      <circle cx="220" cy="90" r="8" fill="#16d9ff" />
      <circle cx="152" cy="99" r="2.6" fill="#ff3fc8" />
      <circle cx="166" cy="97" r="2.6" fill="#ff3fc8" />
      <circle cx="180" cy="95" r="2.6" fill="#ff3fc8" />
    </svg>
  );
}
