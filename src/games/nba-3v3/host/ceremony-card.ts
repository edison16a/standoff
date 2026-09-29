import { playerColor } from "@/games/kit/players";
import type { Ceremony } from "../engine/ceremony";
import type { Match } from "../engine/match";
import { TEAMS } from "../roster";

/** Where the ceremony is, for the overlay: the trophy at the captain's chest, raised with the names up, or the box scores. */
export type CeremonyStage = "cup" | "raised" | "stats";

/** The winners' names over the ceremony, and a line under them. */
export interface CeremonyCard {
  stage: CeremonyStage;
  eyebrow: string;
  names: { name: string; colour: string }[];
  subtitle: string;
}

/**
 * The card over the trophy ceremony, or null before it starts. The
 * names are the winning team's people by their own names, top scorer
 * first; a team of computer players only is named by its colour.
 * `statsNow` is the host asking for the box scores early.
 */
export function ceremonyCard(m: Match, run: Ceremony | null, nameOf: (id: number) => string, statsNow: boolean): CeremonyCard | null {
  if (!run) return null;
  const team = run.team;
  const people = m.athletes
    .filter((a) => a.team === team && a.seat !== null)
    .sort((a, b) => b.box.points - a.box.points || a.slot - b.slot)
    .map((a) => ({ name: nameOf(a.id) || TEAMS[team].name, colour: playerColor(a.seat!) }));
  const side = TEAMS[team];
  return {
    stage: statsNow ? "stats" : run.stageName,
    eyebrow: "Champions",
    names: people.length > 0 ? people : [{ name: side.name, colour: side.color }],
    subtitle: `${side.name} win ${m.score[team]} to ${m.score[team === 0 ? 1 : 0]}`,
  };
}
