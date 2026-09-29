import { MAX_RUNNERS, type Role } from "../roles";
import { CHARACTER_IDS, type CharacterId } from "../roster";
import { TEAM_IDS, type TeamId } from "../teams";

export interface Entrant {
  team: TeamId;
  character: CharacterId;
  /** The phone playing them, or null for a computer player. */
  seat: number | null;
  /** The role the host picked. The line up makes sure each side has one quarterback. */
  role: Role;
}

/**
 * Each side as it takes the field: exactly one quarterback, a human one
 * whenever the side has a human, then runners, filled up to two with
 * computer players when `fill` is on. Order is team by team, quarterback
 * first, which becomes the athletes' ids.
 */
export function buildLineup(entrants: readonly Entrant[], fill = true): Entrant[] {
  const used = new Set(entrants.map((e) => e.character));
  const spare = CHARACTER_IDS.filter((c) => !used.has(c));
  let next = 0;
  const botCharacter = (): CharacterId => {
    // Characters nobody picked first; only a crowded lobby of duplicates wraps round.
    const c = spare[next] ?? CHARACTER_IDS[next % CHARACTER_IDS.length]!;
    next++;
    return c;
  };
  const out: Entrant[] = [];
  for (const team of TEAM_IDS) {
    const side = entrants.filter((e) => e.team === team);
    const humans = side.filter((e) => e.seat !== null);
    const qb = pickQuarterback(side, humans);
    const runners = side.filter((e) => e !== qb).slice(0, MAX_RUNNERS);
    out.push(qb ? { ...qb, role: "qb" } : { team, character: botCharacter(), seat: null, role: "qb" });
    for (const r of runners) out.push({ ...r, role: "runner" });
    if (fill) for (let i = runners.length; i < MAX_RUNNERS; i++) out.push({ team, character: botCharacter(), seat: null, role: "runner" });
  }
  return out;
}

/** The host's pick, or the first human, or the first computer player on the side. */
function pickQuarterback(side: readonly Entrant[], humans: readonly Entrant[]): Entrant | null {
  const picked = side.find((e) => e.role === "qb" && e.seat !== null) ?? (humans.length ? null : side.find((e) => e.role === "qb"));
  return picked ?? humans[0] ?? side[0] ?? null;
}
