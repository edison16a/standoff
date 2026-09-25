import { useId } from "react";

/**
 * The game's name as a fairground sign for the icon: SHOOTING in cream
 * on an arched red ribbon, GALLERY in big gold slab letters with a dark
 * outline, and a bullseye with stars on top. Big and simple, so it still
 * reads when the tile is small.
 */
export function Logo() {
  const uid = useId().replace(/:/g, "");
  const ids = { gold: `${uid}g`, ribbon: `${uid}r`, arc: `${uid}a`, word: `${uid}w` };
  const ink = "#2a0710";
  return (
    <svg className="sg-logo" viewBox="0 0 640 360" role="img" aria-label="Shooting Gallery">
      <defs>
        <linearGradient id={ids.gold} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6c2" />
          <stop offset="0.45" stopColor="#ffcb3a" />
          <stop offset="1" stopColor="#e27a12" />
        </linearGradient>
        <linearGradient id={ids.ribbon} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff4a5e" />
          <stop offset="1" stopColor="#b3102a" />
        </linearGradient>
        <path id={ids.arc} d="M92 178 Q320 100 548 178" />
        <text id={ids.word} x="320" y="318" textAnchor="middle" fontSize="146" fontWeight="900" textLength="600" lengthAdjust="spacingAndGlyphs">
          GALLERY
        </text>
      </defs>

      {/* The ribbon: folded tails behind, then the arched band. */}
      <path d="M40 132l66-12 10 64-66 12 14-34z" fill="#8d0c20" stroke={ink} strokeWidth="9" strokeLinejoin="round" />
      <path d="M600 132l-66-12-10 64 66 12-14-34z" fill="#8d0c20" stroke={ink} strokeWidth="9" strokeLinejoin="round" />
      <path d="M92 118 Q320 38 548 118 L548 190 Q320 110 92 190z" fill={`url(#${ids.ribbon})`} stroke={ink} strokeWidth="10" strokeLinejoin="round" />
      <text fontSize="62" fontWeight="900" letterSpacing="5" fill="#fff4dc" stroke={ink} strokeWidth="3" paintOrder="stroke">
        <textPath href={`#${ids.arc}`} startOffset="50%" textAnchor="middle">
          SHOOTING
        </textPath>
      </text>

      {/* GALLERY in four layers: a dropped shadow, a thick outline, a cream rim and the gold fill. */}
      <use href={`#${ids.word}`} transform="translate(0 10)" fill={ink} stroke={ink} strokeWidth="26" strokeLinejoin="round" />
      <use href={`#${ids.word}`} fill="none" stroke={ink} strokeWidth="26" strokeLinejoin="round" />
      <use href={`#${ids.word}`} fill="none" stroke="#fff4dc" strokeWidth="10" strokeLinejoin="round" />
      <use href={`#${ids.word}`} fill={`url(#${ids.gold})`} />

      {/* A bullseye crowning the ribbon, with a star each side. */}
      <g transform="translate(320 40)" stroke={ink} strokeWidth="6">
        <circle r="34" fill="#fff4dc" />
        <circle r="24" fill="#d91a2a" />
        <circle r="14" fill="#fff4dc" />
        <circle r="6" fill="#d91a2a" />
      </g>
      <path d="M232 30l6 16 17 1-13 11 4 17-14-9-14 9 4-17-13-11 17-1z" fill="#ffd23a" stroke={ink} strokeWidth="5" strokeLinejoin="round" />
      <path d="M408 30l6 16 17 1-13 11 4 17-14-9-14 9 4-17-13-11 17-1z" fill="#ffd23a" stroke={ink} strokeWidth="5" strokeLinejoin="round" />
    </svg>
  );
}
