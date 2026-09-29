import { playerColor } from "@/games/kit/players";
import { CEREMONY, ceremonyTime } from "../engine/ceremony";
import type { MatchState } from "../engine/types";
import { TEAMS, other } from "../teams";

/**
 * Where the ceremony is, for the overlay: the cup still at the captain's
 * chest, raised with the names up, or the stats come in.
 */
export type CeremonyStage = "cup" | "raised" | "stats";

/** The winners' names over the ceremony, and a line under them. */
export interface CeremonyCard {
  stage: CeremonyStage;
  eyebrow: string;
  names: { name: string; colour: string }[];
  subtitle: string;
}

/**
 * The card over the trophy ceremony, or null before the scene cuts to
 * it. The names are the winning side's own players, by their own names;
 * a side of computer players only is named by its colour.
 */
export function ceremonyCard(match: MatchState, names: ReadonlyMap<number, string>): CeremonyCard | null {
  const t = ceremonyTime(match);
  const team = match.winner;
  if (t === null || team === null) return null;
  const stage: CeremonyStage = t >= CEREMONY.stats ? "stats" : t >= CEREMONY.up ? "raised" : "cup";
  const people = match.athletes
    .filter((a) => a.team === team && a.seat !== null)
    .sort((a, b) => b.stats.goals - a.stats.goals || a.slot - b.slot)
    .map((a) => ({ name: names.get(a.seat!) ?? TEAMS[team].name, colour: playerColor(a.seat!) }));
  const side = TEAMS[team];
  const score = `${match.score[team]} to ${match.score[other(team)]}`;
  return {
    stage,
    eyebrow: match.golden ? "Golden goal champions" : "Champions",
    names: people.length > 0 ? people : [{ name: side.name, colour: side.color }],
    subtitle: `${side.name} win ${score}`,
  };
}
