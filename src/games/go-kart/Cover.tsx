/** A kart at speed on a strip of track. */
export function Cover() {
  return (
    <svg className="cover__art" viewBox="0 0 320 200" aria-hidden="true">
      <path d="M0 150H320" stroke="var(--border-strong)" strokeWidth="3" />
      <path d="M20 168H90M130 168H200M240 168H310" stroke="var(--border-strong)" strokeWidth="3" strokeLinecap="round" />
      <path d="M40 92H88M26 110H78M44 128H86" stroke="var(--text-muted)" strokeWidth="4" strokeLinecap="round" />
      <path d="M104 132 118 104H196L226 118 240 132Z" fill="var(--text)" />
      <circle cx="170" cy="92" r="16" fill="var(--accent)" />
      <path d="M160 92H182" stroke="var(--bg)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="128" cy="138" r="14" fill="var(--bg)" stroke="var(--text)" strokeWidth="6" />
      <circle cx="220" cy="138" r="14" fill="var(--bg)" stroke="var(--text)" strokeWidth="6" />
    </svg>
  );
}
