import { useId } from "react";

/** One word of the logo in four layers: a dropped shadow, a thick dark outline, a white rim and the bright fill. */
function Word({ id, fill }: { id: string; fill: string }) {
  return (
    <>
      <use href={`#${id}`} transform="translate(0 12)" fill="#1a0f3d" stroke="#1a0f3d" strokeWidth="26" strokeLinejoin="round" />
      <use href={`#${id}`} fill="none" stroke="#1a0f3d" strokeWidth="26" strokeLinejoin="round" />
      <use href={`#${id}`} fill="none" stroke="#ffffff" strokeWidth="11" strokeLinejoin="round" />
      <use href={`#${id}`} fill={`url(#${fill})`} />
    </>
  );
}

/**
 * The game's name as a stylised logo for the icon: chunky slanted
 * letters with a dark outline and a white rim, magic blue over kart
 * orange, speed lines trailing off the back and a sparkle on top. Big
 * and simple, so it still reads when the tile is small.
 */
export function Logo() {
  const uid = useId().replace(/:/g, "");
  const ids = { magic: `${uid}m`, kart: `${uid}k`, blue: `${uid}b`, gold: `${uid}g` };
  return (
    <svg className="mk-logo" viewBox="0 0 640 320" role="img" aria-label="Magic Kart">
      <defs>
        <linearGradient id={ids.blue} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9ff6ff" />
          <stop offset="0.5" stopColor="#3fb2ff" />
          <stop offset="1" stopColor="#9a5cff" />
        </linearGradient>
        <linearGradient id={ids.gold} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff7a1" />
          <stop offset="0.45" stopColor="#ffc81f" />
          <stop offset="1" stopColor="#ff6a1f" />
        </linearGradient>
        <text id={ids.magic} x="330" y="132" textAnchor="middle" fontSize="128" fontWeight="900" letterSpacing="-3">
          MAGIC
        </text>
        <text id={ids.kart} x="340" y="292" textAnchor="middle" fontSize="178" fontWeight="900" letterSpacing="-4">
          KART
        </text>
      </defs>
      <g className="mk-logo__type" transform="skewX(-12) translate(40 0)">
        <path d="M34 196h86M14 230h96M44 264h58" stroke="#1a0f3d" strokeWidth="26" strokeLinecap="round" />
        <path d="M34 196h86M14 230h96M44 264h58" stroke="#ffffff" strokeWidth="11" strokeLinecap="round" />
        <Word id={ids.kart} fill={ids.gold} />
        <Word id={ids.magic} fill={ids.blue} />
      </g>
      <path d="M606 4l8 22 22 8-22 8-8 22-8-22-22-8 22-8z" fill="#ffffff" stroke="#1a0f3d" strokeWidth="6" strokeLinejoin="round" />
    </svg>
  );
}
