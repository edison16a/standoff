import type { AimStep } from "./protocol";

const TARGET_AT: Record<"center" | "top-left" | "bottom-right", { x: number; y: number }> = {
  center: { x: 120, y: 58 },
  "top-left": { x: 52, y: 26 },
  "bottom-right": { x: 188, y: 90 },
};

/**
 * A little picture of what to do: the big screen with the target lit up,
 * and the phone lying flat in the hand with its top edge aimed at it.
 */
export function PointGuide({ step, colour }: { step: AimStep; colour: string }) {
  const target = TARGET_AT[step === "top-left" || step === "bottom-right" ? step : "center"];
  return (
    <svg className="kit-guide" viewBox="0 0 240 230" role="img" aria-label="Point the top of your phone at the target on the big screen">
      <rect x="20" y="10" width="200" height="112" rx="10" className="kit-guide__screen" />
      <rect x="104" y="122" width="32" height="12" className="kit-guide__stand" />
      <circle cx={target.x} cy={target.y} r="15" fill="none" stroke={colour} strokeWidth="4" />
      <circle cx={target.x} cy={target.y} r="5" fill={colour} />
      <line x1="120" y1="164" x2={target.x} y2={target.y + 16} stroke={colour} strokeWidth="3" strokeDasharray="6 6" strokeLinecap="round" />
      <g transform="translate(120 184) scale(1 0.55)">
        <rect x="-26" y="-44" width="52" height="88" rx="10" className="kit-guide__phone" />
        <rect x="-10" y="-40" width="20" height="4" rx="2" fill={colour} />
      </g>
      <text x="120" y="226" textAnchor="middle" className="kit-guide__caption">
        top edge forward, screen up
      </text>
    </svg>
  );
}
