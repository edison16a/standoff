import "./hold-art.css";
import type { ReactNode } from "react";
import type { AimZone } from "../aim-math";

/** The big screen's picture area in the art, in its own units. */
export const ART_SCREEN = { x: 211, y: 37, w: 94, h: 58 } as const;

interface HoldArtProps {
  /** A game's own scene on the big screen, drawn in the art's units inside ART_SCREEN, like Blade Clash's two fighters. */
  scene?: ReactNode;
  /** The player's part of the big screen, lit in their colour, with the target in its middle. */
  zone?: AimZone;
  colour?: string;
  label?: string;
}

/**
 * The grip, drawn in three quarter view: the phone lying flat in the hand,
 * screen up, its top edge aimed at the target on the big screen. One
 * picture answers "how do I hold it and where do I point it" faster than
 * any sentence. Every aiming game opens its calibration with it.
 */
export function HoldArt({ scene, zone, colour, label = "Hold the phone flat, top edge pointing at the big screen" }: HoldArtProps) {
  const box = zone
    ? { x: ART_SCREEN.x + zone.x * ART_SCREEN.w, y: ART_SCREEN.y + zone.y * ART_SCREEN.h, w: zone.w * ART_SCREEN.w, h: zone.h * ART_SCREEN.h }
    : ART_SCREEN;
  const target = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  // The aim line runs from the phone's top edge to just short of the target, with its arrow head turned along it.
  const angle = (Math.atan2(target.y - 124, target.x - 160) * 180) / Math.PI;
  const tip = { x: target.x - 10 * Math.cos((angle * Math.PI) / 180), y: target.y - 10 * Math.sin((angle * Math.PI) / 180) };
  return (
    <svg className="hold-art" viewBox="0 0 320 210" role="img" aria-label={label}>
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

      {/* The big screen, with the game's scene and the aim point. */}
      <rect x="204" y="30" width="108" height="72" rx="9" className="hold-art__tv" />
      <rect x={ART_SCREEN.x} y={ART_SCREEN.y} width={ART_SCREEN.w} height={ART_SCREEN.h} rx="4" fill="url(#hold-art-screen)" />
      {zone && colour && <rect x={box.x + 1} y={box.y + 1} width={box.w - 2} height={box.h - 2} rx="3" fill={colour} className="hold-art__zone" />}
      {scene}
      <circle cx={target.x} cy={target.y} r="10" className="hold-art__target" style={{ transformOrigin: `${target.x}px ${target.y}px` }} />
      <circle cx={target.x} cy={target.y} r="3" className="hold-art__target-dot" />
      <path d="M250 102h16l5 12h-26z" className="hold-art__stand" />

      {/* The aim line, from the phone's top edge to the target. */}
      <path d={`M160 124 L${tip.x} ${tip.y}`} className="hold-art__aim" />
      <path d="M-7 -5 L0 0 L-7 5" className="hold-art__aim-head" transform={`translate(${tip.x} ${tip.y}) rotate(${angle})`} />

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
