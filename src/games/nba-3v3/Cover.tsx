/** A ball dropping through a hoop. A stand in until the game captures its own media. */
export function Cover() {
  return (
    <svg className="cover__art" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="320" height="200" fill="#1e1b4b" />
      <rect x="0" y="150" width="320" height="50" fill="#b45309" />
      <rect x="120" y="30" width="80" height="54" rx="4" fill="#f8fafc" />
      <ellipse cx="160" cy="92" rx="26" ry="6" fill="none" stroke="#f97316" strokeWidth="5" />
      <circle cx="160" cy="70" r="16" fill="#ea580c" />
    </svg>
  );
}
