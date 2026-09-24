/** A pitch on its way, stitches spinning, and the bat waiting for it. */
export function Cover() {
  return (
    <svg className="cover__art" viewBox="0 0 320 200" aria-hidden="true">
      <path d="M40 150C90 90 150 80 200 96" fill="none" stroke="var(--text-muted)" strokeWidth="4" strokeDasharray="2 12" strokeLinecap="round" />
      <circle cx="214" cy="100" r="30" fill="var(--bg)" stroke="var(--text)" strokeWidth="5" />
      <path d="M196 78C206 92 206 108 196 122M232 78C222 92 222 108 232 122" fill="none" stroke="var(--accent)" strokeWidth="4" />
      <path d="M252 168 290 48" stroke="var(--text)" strokeWidth="14" strokeLinecap="round" />
      <path d="M252 168 258 150" stroke="var(--accent)" strokeWidth="16" strokeLinecap="round" />
    </svg>
  );
}
