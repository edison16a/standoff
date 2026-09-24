/** A fruit cut clean in two by one swipe. */
export function Cover() {
  return (
    <svg className="cover__art" viewBox="0 0 320 200" aria-hidden="true">
      <path d="M118 112A44 44 0 0 1 198 80Z" fill="var(--text)" />
      <path d="M134 128A44 44 0 0 0 214 96Z" fill="var(--text)" />
      <path d="M121 107 197 84M137 124 211 101" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" />
      <path d="M70 170 270 30" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="228" cy="130" r="5" fill="var(--accent)" />
      <circle cx="96" cy="72" r="4" fill="var(--accent)" />
      <circle cx="244" cy="150" r="3" fill="var(--accent)" />
    </svg>
  );
}
