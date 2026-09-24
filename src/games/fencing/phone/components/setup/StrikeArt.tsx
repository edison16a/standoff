import type { StrikeAction } from "@/games/fencing/protocol";

/**
 * The motion for a strike, drawn: the phone flat in the hand, with a bold
 * arrow chopping down for a jab or lifting up for a parry, and speed lines
 * so it reads as a quick snap rather than a slow move.
 */
export function StrikeArt({ action }: { action: StrikeAction }) {
  const down = action === "jab";
  return (
    <svg className={`strike-art strike-art--${action}`} viewBox="0 0 160 120" role="img" aria-label={down ? "A sharp chop down" : "A sharp lift up"}>
      <g className="strike-art__phone">
        <path d="M34 72 L118 48 L128 55 L44 79 Z" className="strike-art__slab" />
        <path d="M44 79 L128 55 L128 59 L44 83 Z" className="strike-art__edge" />
        <ellipse cx="52" cy="80" rx="22" ry="11" transform="rotate(-16 52 80)" className="strike-art__hand" />
      </g>
      <g className="strike-art__arrow">
        {down ? (
          <path d="M92 8 C 96 22, 96 30, 92 40 M82 30 L92 42 L102 30" className="strike-art__stroke" />
        ) : (
          <path d="M92 44 C 96 30, 96 22, 92 10 M82 22 L92 8 L102 22" className="strike-art__stroke" />
        )}
        <path d={down ? "M74 12v14M112 14v12" : "M74 26v14M112 26v12"} className="strike-art__speed" />
      </g>
    </svg>
  );
}
