/**
 * A small drawing of the grip: a hand holding the phone out like a sword
 * hilt, the phone pointing across at the computer screen. One picture
 * answers "how do I hold it and where do I point it" faster than a sentence.
 */
export function HoldGuide() {
  return (
    <svg className="hold-guide" viewBox="0 0 240 120" role="img" aria-label="Hold the phone like a sword, pointing at the screen">
      <rect x="164" y="16" width="64" height="44" rx="6" className="hold-guide__line" />
      <path d="M196 60v12M182 74h28" className="hold-guide__line" />
      <path d="M186 44 206 30M204 44 186 30" className="hold-guide__accent" />
      <path d="M104 74 158 46" className="hold-guide__dash" />
      <rect x="30" y="66" width="76" height="18" rx="5" className="hold-guide__phone" />
      <rect x="18" y="58" width="34" height="36" rx="12" className="hold-guide__hand" />
      <path d="M52 66v20" className="hold-guide__line" />
    </svg>
  );
}
