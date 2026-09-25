import type { StrikeAction } from "@/games/blade-clash/protocol";

/**
 * The motion for an action, drawn: the phone flat in the hand, with shake
 * marks round its tip for a jab, or a bold arrow sweeping up and to the
 * right for a parry.
 */
export function StrikeArt({ action }: { action: StrikeAction }) {
  const jab = action === "jab";
  return (
    <svg className={`strike-art strike-art--${action}`} viewBox="0 0 160 120" role="img" aria-label={jab ? "A quick flick or shake" : "A raise up and to the right"}>
      <g className="strike-art__phone">
        <path d="M34 72 L118 48 L128 55 L44 79 Z" className="strike-art__slab" />
        <path d="M44 79 L128 55 L128 59 L44 83 Z" className="strike-art__edge" />
        <ellipse cx="52" cy="80" rx="22" ry="11" transform="rotate(-16 52 80)" className="strike-art__hand" />
      </g>
      <g className="strike-art__arrow">
        {jab ? (
          <>
            <path d="M136 36 q10 14 0 28 M146 30 q14 20 0 40" className="strike-art__stroke" />
            <path d="M110 32 q-10 -12 4 -22 M98 36 q-14 -16 4 -30" className="strike-art__speed" />
          </>
        ) : (
          <>
            <path d="M84 40 C 100 36, 118 26, 132 8 M116 8 L133 7 L131 24" className="strike-art__stroke" />
            <path d="M72 30l10 -8M100 16l8 -8" className="strike-art__speed" />
          </>
        )}
      </g>
    </svg>
  );
}
