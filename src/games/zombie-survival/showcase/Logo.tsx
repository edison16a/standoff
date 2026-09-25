/** The big word's glyphs lean and bob a little each, like letters hacked out by hand. */
const WORD = { x: 500, y: 250, length: 900, rotate: "-4 3 -2 4 -3 3", dy: "0 -8 12 -10 9 -8" };
/** Where the drips hang off the bottoms of the letters, and how far. */
const DRIPS: readonly [x: number, length: number][] = [
  [104, 44],
  [176, 78],
  [298, 52],
  [452, 96],
  [604, 40],
  [730, 70],
  [886, 50],
];

/**
 * The game's name as key art: ZOMBIE in heavy, mottled, sickly green
 * letters with drips running off them, over SURVIVAL cut into a blood
 * red band. Drawn in SVG so it stays sharp at any size. The letters are
 * squeezed to set widths and fattened with their own outline, so the
 * logo keeps its shape whichever heavy font the machine has.
 */
export function Logo() {
  const word = (props: React.SVGProps<SVGTextElement>) => (
    <text x={WORD.x} y={WORD.y} textAnchor="middle" textLength={WORD.length} lengthAdjust="spacingAndGlyphs" rotate={WORD.rotate} dy={WORD.dy} className="zs-logo__word" strokeLinejoin="round" {...props}>
      ZOMBIE
    </text>
  );
  return (
    <svg className="zs-logo" viewBox="0 0 1000 470" role="img" aria-label="Zombie Survival">
      <defs>
        <linearGradient id="zs-logo-green" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0ffc4" />
          <stop offset="0.35" stopColor="#9cf56e" />
          <stop offset="0.75" stopColor="#35a843" />
          <stop offset="1" stopColor="#17602a" />
        </linearGradient>
        <linearGradient id="zs-logo-red" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff5040" />
          <stop offset="1" stopColor="#8a0c12" />
        </linearGradient>
        {/* Rough edges and rot: the outline wanders, and dark blotches stain the green. */}
        <filter id="zs-logo-rot" x="-5%" y="-15%" width="110%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="8" xChannelSelector="R" yChannelSelector="G" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="11" result="blotch" />
          <feColorMatrix in="blotch" type="matrix" values="0 0 0 0 0.03  0 0 0 0 0.16  0 0 0 0 0.04  0 0 0 -5 2.1" result="stain" />
          <feComposite in="stain" in2="rough" operator="in" result="stained" />
          <feMerge>
            <feMergeNode in="rough" />
            <feMergeNode in="stained" />
          </feMerge>
        </filter>
        <filter id="zs-logo-glow" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        {/* The shadow is drawn in the SVG, not by CSS, so it is painted once and not on every frame of the scene below. */}
        <filter id="zs-logo-shadow" x="-10%" y="-20%" width="120%" height="150%">
          <feDropShadow dx="0" dy="10" stdDeviation="22" floodColor="#000" floodOpacity="0.8" />
        </filter>
      </defs>

      <g filter="url(#zs-logo-glow)" opacity="0.7">
        {word({ fill: "#5cff4a", stroke: "#5cff4a", strokeWidth: 24 })}
      </g>

      <g filter="url(#zs-logo-shadow)">
        <g filter="url(#zs-logo-rot)">
          {/* A dark rim first, then the letters fattened by an outline of their own green. */}
          {word({ fill: "#041006", stroke: "#041006", strokeWidth: 44 })}
          <g fill="#041006">
            {DRIPS.map(([x, length]) => (
              <path key={x} d={`M${x - 15} 228 h30 v${length} a15 15 0 0 1 -30 0 z`} />
            ))}
          </g>
          {word({ fill: "url(#zs-logo-green)", stroke: "url(#zs-logo-green)", strokeWidth: 18 })}
          <g fill="#3fb04b">
            {DRIPS.map(([x, length]) => (
              <path key={x} d={`M${x - 8} 226 h16 v${length} a8 8 0 0 1 -16 0 z`} />
            ))}
          </g>
        </g>

        <g transform="translate(500 372) skewX(-12)">
          <rect x="-390" y="-56" width="780" height="100" rx="6" fill="url(#zs-logo-red)" stroke="#1a0304" strokeWidth="8" />
          <text x="0" y="27" textAnchor="middle" textLength="660" lengthAdjust="spacingAndGlyphs" className="zs-logo__sub" fill="#f6eedb" stroke="#f6eedb" strokeWidth="3">
            SURVIVAL
          </text>
        </g>
      </g>
    </svg>
  );
}
