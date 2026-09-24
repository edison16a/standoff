/** Two sights, back to back, holding the line. */
export function Cover() {
  return (
    <svg className="cover__art" viewBox="0 0 320 200" aria-hidden="true">
      {[110, 210].map((x, i) => (
        <g key={x} stroke={i === 0 ? "var(--accent)" : "var(--text)"} strokeWidth="5" fill="none" strokeLinecap="round">
          <circle cx={x} cy="100" r="40" />
          <circle cx={x} cy="100" r="5" fill={i === 0 ? "var(--accent)" : "var(--text)"} />
          <path d={`M${x} 48V70M${x} 130V152M${x - 52} 100H${x - 30}M${x + 30} 100H${x + 52}`} />
        </g>
      ))}
    </svg>
  );
}
