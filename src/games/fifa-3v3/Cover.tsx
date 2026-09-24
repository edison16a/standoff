/** A ball flying into a goal. A stand in until the game captures its own media. */
export function Cover() {
  return (
    <svg className="cover__art" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="320" height="200" fill="#15803d" />
      <path d="M0 150H320" stroke="#dcfce7" strokeWidth="3" />
      <rect x="100" y="60" width="120" height="70" fill="none" stroke="#f8fafc" strokeWidth="5" />
      <circle cx="176" cy="92" r="13" fill="#f8fafc" />
    </svg>
  );
}
