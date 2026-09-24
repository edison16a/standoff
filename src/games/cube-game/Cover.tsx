/** A cube leaping a spike. A stand in until the game captures its own media. */
export function Cover() {
  return (
    <svg className="cover__art" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="320" height="200" fill="#2e1065" />
      <rect x="0" y="140" width="320" height="60" fill="#581c87" />
      <path d="M190 140 206 112 222 140Z" fill="#f0abfc" />
      <rect x="120" y="80" width="34" height="34" rx="4" fill="#facc15" transform="rotate(20 137 97)" />
    </svg>
  );
}
