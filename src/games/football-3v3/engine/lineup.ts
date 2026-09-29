import { CHARACTER_IDS, type CharacterId } from "../roster";
import type { TeamId } from "../teams";

/** One player the match should field. Linemen are added by the match itself. */
export interface Entry {
  team: TeamId;
  role: "qb" | "runner";
  character: CharacterId;
  /** The phone playing them, or null for a computer player. */
  seat: number | null;
}

/** A person in the lobby: their team, their pick and whether they asked to play QB. */
export interface Signup {
  seat: number;
  team: TeamId;
  character: CharacterId;
  qb?: boolean;
}

export const MAX_RUNNERS = 2;
export const MAX_PER_TEAM = 1 + MAX_RUNNERS;

/** Why a lineup cannot be played, or null when it can. */
export function lineupProblem(entries: readonly Entry[]): string | null {
  for (const team of [0, 1] as const) {
    const side = entries.filter((e) => e.team === team);
    const qbs = side.filter((e) => e.role === "qb");
    if (qbs.length !== 1) return `Team ${team + 1} needs exactly one QB.`;
    if (side.length - 1 > MAX_RUNNERS) return `Team ${team + 1} has more than ${MAX_RUNNERS} runners.`;
    if (qbs[0]!.seat === null && side.some((e) => e.seat !== null)) return `Team ${team + 1} has a person, so a person plays QB.`;
  }
  const seats = entries.flatMap((e) => (e.seat === null ? [] : [e.seat]));
  if (new Set(seats).size !== seats.length) return "A phone can only play one player.";
  return null;
}

/**
 * Turns the lobby into a lineup. On each team the person who asked to
 * play QB does (else the first to sign up), the other people run, and
 * computer runners fill the team up to `runners` with players nobody on
 * that team picked.
 */
export function buildLineup(signups: readonly Signup[], runners = MAX_RUNNERS): Entry[] {
  const entries: Entry[] = [];
  for (const team of [0, 1] as const) {
    const people = signups.filter((s) => s.team === team).slice(0, MAX_PER_TEAM);
    const qb = people.find((s) => s.qb) ?? people[0];
    const used = new Set(people.map((p) => p.character));
    const spare = () => {
      const pick = CHARACTER_IDS.find((c) => !used.has(c)) ?? CHARACTER_IDS[entries.length % CHARACTER_IDS.length]!;
      used.add(pick);
      return pick;
    };
    entries.push(qb ? { team, role: "qb", character: qb.character, seat: qb.seat } : { team, role: "qb", character: spare(), seat: null });
    const humans = people.filter((p) => p !== qb);
    for (const p of humans) entries.push({ team, role: "runner", character: p.character, seat: p.seat });
    for (let n = humans.length; n < Math.min(MAX_RUNNERS, runners); n++) entries.push({ team, role: "runner", character: spare(), seat: null });
  }
  return entries;
}
