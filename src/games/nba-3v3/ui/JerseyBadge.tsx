import type { TeamId } from "../engine/types";
import { CHARACTERS, TEAMS, type CharacterId } from "../roster";

/**
 * A little jersey in team colours with the star's number, and their skin
 * and hair above it, as a flat picture for lists and cards.
 */
export function JerseyBadge({ character, team, size = 56 }: { character: CharacterId; team: TeamId | null; size?: number }) {
  const c = CHARACTERS[character];
  const t = team === null ? { color: "#64748b", dark: "#334155", trim: "#e2e8f0" } : TEAMS[team];
  const bald = c.look.hair === "bald" || c.look.hair === "buzz";
  return (
    <svg className="nba-badge" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="15" r="10" fill={c.look.skin} />
      <path d={bald ? "M22 13 a10 10 0 0 1 20 0 a14 12 0 0 0 -20 0z" : "M21 15 a11 11 0 0 1 22 0 c-3 -4 -7 -5 -11 -5 s-8 1 -11 5z"} fill={c.look.hairColor} />
      {c.look.headband && <rect x="22" y="9" width="20" height="3.5" rx="1.5" fill={c.look.headband} />}
      <path d="M18 27 c4 -3 8 -3 10 -1 c2 3 6 3 8 0 c2 -2 6 -2 10 1 l2 30 c-12 3 -20 3 -32 0z" fill={t.color} stroke={t.dark} strokeWidth="1.5" />
      <text x="32" y="50" textAnchor="middle" fontSize="17" fontWeight="900" fontStyle="italic" fill="#ffffff" stroke={t.dark} strokeWidth="0.8" fontFamily="Impact, 'Arial Black', sans-serif">
        {c.number}
      </text>
    </svg>
  );
}
