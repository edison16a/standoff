import { useId } from "react";

/** One word in four layers: a dropped shadow, a thick dark outline, a white rim and the bright fill. */
function Word({ id, fill }: { id: string; fill: string }) {
  return (
    <>
      <use href={`#${id}`} transform="translate(0 12)" fill="#12052e" stroke="#12052e" strokeWidth="26" strokeLinejoin="round" />
      <use href={`#${id}`} fill="none" stroke="#12052e" strokeWidth="26" strokeLinejoin="round" />
      <use href={`#${id}`} fill="none" stroke="#ffffff" strokeWidth="10" strokeLinejoin="round" />
      <use href={`#${id}`} fill={`url(#${fill})`} />
    </>
  );
}

/**
 * The name as a logo: CUBE in hot gold over GAME in electric cyan, with
 * a little tilted cube for the dot of it all. Chunky and outlined, so it
 * still reads on a small tile.
 */
export function Logo() {
  const uid = useId().replace(/:/g, "");
  const ids = { cube: `${uid}c`, game: `${uid}g`, gold: `${uid}o`, cyan: `${uid}y` };
  return (
    <svg className="cg-logo" viewBox="0 0 640 330" role="img" aria-label="Cube Game">
      <defs>
        <linearGradient id={ids.gold} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff9b0" />
          <stop offset="0.5" stopColor="#ffd21f" />
          <stop offset="1" stopColor="#ff7a1f" />
        </linearGradient>
        <linearGradient id={ids.cyan} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8fbff" />
          <stop offset="0.5" stopColor="#3ee6ff" />
          <stop offset="1" stopColor="#8a5cff" />
        </linearGradient>
        <text id={ids.cube} x="345" y="140" textAnchor="middle" fontSize="150" fontWeight="900" letterSpacing="2">
          CUBE
        </text>
        <text id={ids.game} x="320" y="300" textAnchor="middle" fontSize="150" fontWeight="900" letterSpacing="2">
          GAME
        </text>
      </defs>
      <g transform="rotate(-4 320 165)">
        <Word id={ids.game} fill={ids.cyan} />
        <Word id={ids.cube} fill={ids.gold} />
      </g>
      <g transform="translate(64 58) rotate(-16)">
        <rect x="-38" y="-38" width="76" height="76" rx="6" fill="#12052e" transform="translate(0 10)" />
        <rect x="-38" y="-38" width="76" height="76" rx="6" fill="#ff4757" stroke="#12052e" strokeWidth="10" />
        <rect x="-22" y="-22" width="44" height="44" fill="#ffe14d" stroke="#12052e" strokeWidth="6" />
        <rect x="-12" y="-10" width="7" height="11" fill="#12052e" />
        <rect x="5" y="-10" width="7" height="11" fill="#12052e" />
        <rect x="-12" y="7" width="24" height="5" fill="#12052e" />
      </g>
    </svg>
  );
}
