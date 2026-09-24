/**
 * The grip, drawn from the side: the phone held flat like a sword hilt,
 * its top edge pointing at the middle of the computer screen. One picture
 * answers "how do I hold it and where do I point it" faster than a sentence.
 */
export function HoldGuide() {
  return (
    <svg className="hold-guide" viewBox="0 0 240 120" role="img" aria-label="Hold the phone flat, top edge pointing at the middle of the screen">
      <rect x="164" y="12" width="68" height="48" rx="6" className="hold-guide__line" />
      <path d="M198 60v12M184 74h28" className="hold-guide__line" />
      <circle cx="198" cy="36" r="9" className="hold-guide__accent" />
      <circle cx="198" cy="36" r="2.5" className="hold-guide__dot" />
      <path d="M108 72 188 38" className="hold-guide__dash" />
      <rect x="30" y="66" width="80" height="12" rx="4" className="hold-guide__phone" />
      <rect x="18" y="58" width="34" height="30" rx="12" className="hold-guide__hand" />
      <path d="M100 58l10 8-10 8" className="hold-guide__accent" />
    </svg>
  );
}
