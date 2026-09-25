/**
 * The grip, drawn in three quarter view: the phone lying flat in the hand
 * like a sword's hilt, screen up, its top edge aimed at the middle of the
 * big screen, where the fencers are. One picture answers "how do I hold
 * it and where do I point it" faster than any sentence.
 */
export function HoldArt() {
  return (
    <svg className="hold-art" viewBox="0 0 320 210" role="img" aria-label="Hold the phone flat, screen up, top edge pointing at the middle of the big screen">
      <defs>
        <linearGradient id="hold-art-screen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2c2366" />
          <stop offset="1" stopColor="#0f0b26" />
        </linearGradient>
        <linearGradient id="hold-art-phone" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" className="hold-art__glass-a" />
          <stop offset="1" className="hold-art__glass-b" />
        </linearGradient>
      </defs>
      <ellipse cx="160" cy="196" rx="150" ry="9" className="hold-art__floor" />

      {/* The big screen, showing the strip, with the aim point in the middle. */}
      <rect x="204" y="30" width="108" height="72" rx="9" className="hold-art__tv" />
      <rect x="211" y="37" width="94" height="58" rx="4" fill="url(#hold-art-screen)" />
      <rect x="218" y="80" width="80" height="4" rx="2" fill="#3f74ad" />
      <path d="M233 80v-13m0 0l-4 13m4-13 5 -3" className="hold-art__fencer hold-art__fencer--red" />
      <circle cx="233" cy="63" r="3" fill="#ff4757" />
      <path d="M283 80v-13m0 0 4 13m-4-13-5 -3" className="hold-art__fencer hold-art__fencer--green" />
      <circle cx="283" cy="63" r="3" fill="#2ed573" />
      <circle cx="258" cy="66" r="10" className="hold-art__target" />
      <circle cx="258" cy="66" r="3" className="hold-art__target-dot" />
      <path d="M250 102h16l5 12h-26z" className="hold-art__stand" />

      {/* The aim line, from the phone's top edge to the middle of the screen. */}
      <path d="M160 124 L248 72" className="hold-art__aim" />
      <path d="M241 69l8 2-3 8" className="hold-art__aim-head" />

      {/* Forearm and palm under the phone. */}
      <path d="M-6 214 C 20 196, 40 180, 58 166 L 84 178 C 64 192, 44 206, 26 222 Z" className="hold-art__skin" />
      <ellipse cx="80" cy="160" rx="34" ry="17" transform="rotate(-16 80 160)" className="hold-art__skin" />

      {/* The phone: a thin slab lying flat, screen up, top edge toward the big screen. */}
      <path d="M58 159 L158 131 L158 136 L58 164 Z" className="hold-art__edge" />
      <path d="M150 121 L162 129 L162 134 L150 126 Z" className="hold-art__edge" />
      <path d="M46 151 L150 121 L162 129 L58 159 Z" className="hold-art__phone" fill="url(#hold-art-phone)" />
      <path d="M58 150 L146 125 L153 130 L65 155 Z" className="hold-art__glass" />
      <path d="M139 127 l6 -2" className="hold-art__speaker" />

      {/* Fingers wrapping over the near edge, and the thumb along the far side. */}
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={70 + i * 13} y={153 - i * 3.6} width="11" height="17" rx="5.5" transform={`rotate(-16 ${75 + i * 13} ${161 - i * 3.6})`} className="hold-art__skin" />
      ))}
      <path d="M52 146 C 64 138, 82 133, 100 131 C 106 130, 108 136, 102 138 C 86 142, 70 146, 58 152 Z" className="hold-art__skin" />
    </svg>
  );
}
