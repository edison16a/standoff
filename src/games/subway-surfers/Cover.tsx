/** Three tracks through a sunny rail yard, a red train and a coin. A stand in until the game captures its own media. */
export function Cover() {
  return (
    <svg className="cover__art" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="320" height="200" fill="#5db8f2" />
      <ellipse cx="90" cy="46" rx="34" ry="14" fill="#ffffff" />
      <ellipse cx="228" cy="34" rx="42" ry="15" fill="#ffffff" />
      <rect y="84" width="320" height="36" fill="#e3a867" />
      <rect x="20" y="70" width="40" height="50" fill="#d8704c" />
      <rect x="262" y="64" width="44" height="56" fill="#8fb4d6" />
      <path d="M0 120H320V200H0Z" fill="#b8a48a" />
      <path d="M150 120 40 200M160 120 160 200M170 120 280 200" stroke="#e6ecf2" strokeWidth="5" />
      <rect x="196" y="122" width="44" height="34" rx="5" fill="#e23b2e" stroke="#1f2138" strokeWidth="3" />
      <rect x="203" y="128" width="30" height="12" rx="3" fill="#bfe8ff" />
      <circle cx="120" cy="150" r="12" fill="#ffc21a" stroke="#1f2138" strokeWidth="3" />
    </svg>
  );
}
