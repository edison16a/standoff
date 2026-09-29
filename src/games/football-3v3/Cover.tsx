/** A spiral flying over the yard lines toward the posts. A stand in until the game captures its own media. */
export function Cover() {
  return (
    <svg className="cover__art" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="320" height="200" fill="#0b1330" />
      <path d="M0 120H320V200H0Z" fill="#2f7a36" />
      <path d="M40 200 70 120M120 200 130 120M200 200 190 120M280 200 250 120" stroke="#e8f5e9" strokeWidth="3" />
      <path d="M0 158H320" stroke="#2f7bff" strokeWidth="4" />
      <path d="M0 140H320" stroke="#ffe11a" strokeWidth="4" />
      <path d="M262 118V70M248 70H276M248 70V36M276 70V36" stroke="#f5c518" strokeWidth="5" strokeLinecap="round" fill="none" />
      <g transform="rotate(-24 150 78)">
        <ellipse cx="150" cy="78" rx="30" ry="17" fill="#8b4513" />
        <path d="M138 78h24M143 73v10M150 73v10M157 73v10" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <path d="M70 110C95 90 110 84 122 84" stroke="#ffd23f" strokeWidth="3" strokeDasharray="6 6" fill="none" />
    </svg>
  );
}
