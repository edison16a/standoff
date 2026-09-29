import { playerColor } from "@/games/kit/players";
import { CEREMONY, ceremonyTime } from "../engine/ceremony";
import type { Match } from "../engine/match";
import { TEAMS, other } from "../teams";

/** Where the presentation is: the trophy still at the captain's chest, raised with the names up, or the stats in. */
export type CeremonyStage = "trophy" | "raised" | "stats";

/** The winners' names over the presentation, and a line under them. */
export interface CeremonyCard {
  stage: CeremonyStage;
  eyebrow: string;
  names: { name: string; colour: string }[];
  subtitle: string;
}

/**
 * The card over the trophy presentation, or null before the scene cuts
 * to it. The names are the winning side's own players by the names they
 * typed, the one lifting the trophy first; a side of computer players
 * only is named by its team.
 */
export function ceremonyCard(m: Match, names: ReadonlyMap<number, string>): CeremonyCard | null {
  const t = ceremonyTime(m);
  const team = m.winner;
  if (t === null || team === null) return null;
  const stage: CeremonyStage = t >= CEREMONY.stats ? "stats" : t >= CEREMONY.up ? "raised" : "trophy";
  const captain = m.ceremony?.captain ?? null;
  const people = m.athletes
    .filter((a) => a.team === team && a.seat !== null)
    .sort((a, b) => Number(b.id === captain) - Number(a.id === captain) || a.id - b.id)
    .map((a) => ({ name: names.get(a.seat!) ?? TEAMS[team].name, colour: playerColor(a.seat!) }));
  const side = TEAMS[team];
  return {
    stage,
    eyebrow: m.overtime ? "Overtime champions" : "Champions",
    names: people.length > 0 ? people : [{ name: side.name, colour: side.color }],
    subtitle: `${side.name} win ${m.score[team]} to ${m.score[other(team)]}`,
  };
}
