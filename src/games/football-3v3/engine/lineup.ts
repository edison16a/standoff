import { BUILD_IDS, BUILDS, type BuildId } from "../builds";
import type { TeamId } from "../teams";

/** One player the match should field. Linemen are added by the match itself. */
export interface Entry {
  team: TeamId;
  role: "qb" | "runner";
  build: BuildId;
  /** The phone playing them, or null for a computer player. */
  seat: number | null;
}

/** A person in the lobby: their team, their pick and whether they asked to play QB. */
export interface Signup {
  seat: number;
  team: TeamId;
  build: BuildId;
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
 * Takes a computer player's build out of `spare`: one made for the
 * place (a QB build for QB, any other for a runner) when there is one,
 * else the first left, else the first build of all.
 */
export function takeSpare(spare: BuildId[], role: "qb" | "runner"): BuildId {
  const fits = (id: BuildId) => (BUILDS[id].best === "qb") === (role === "qb");
  const at = Math.max(0, spare.findIndex(fits));
  return spare.splice(at, 1)[0] ?? BUILD_IDS[0];
}

/**
 * Turns the lobby into a lineup. On each team the person who asked to
 * play QB does (else the first to sign up), the other people run, and
 * computer players fill the team up to `runners` in builds nobody
 * picked, a QB build at QB when one is free.
 */
export function buildLineup(signups: readonly Signup[], runners = MAX_RUNNERS): Entry[] {
  const entries: Entry[] = [];
  // Nobody's pick is copied, on either side, while there are builds to spare.
  const used = new Set(signups.map((p) => p.build));
  const free = BUILD_IDS.filter((c) => !used.has(c));
  for (const team of [0, 1] as const) {
    const people = signups.filter((s) => s.team === team).slice(0, MAX_PER_TEAM);
    const qb = people.find((s) => s.qb) ?? people[0];
    entries.push(qb ? { team, role: "qb", build: qb.build, seat: qb.seat } : { team, role: "qb", build: takeSpare(free, "qb"), seat: null });
    const humans = people.filter((p) => p !== qb);
    for (const p of humans) entries.push({ team, role: "runner", build: p.build, seat: p.seat });
    for (let n = humans.length; n < Math.min(MAX_RUNNERS, runners); n++) entries.push({ team, role: "runner", build: takeSpare(free, "runner"), seat: null });
  }
  return entries;
}
