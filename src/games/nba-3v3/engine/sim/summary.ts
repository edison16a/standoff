import type { ShotLog, ShotRecord, ShotType } from "./shot-log";

/** Contest bands for the tables: open, a hand near, and a hand in the face. */
export const CONTEST_BANDS = [
  { name: "open", max: 0.15 },
  { name: "light", max: 0.4 },
  { name: "tight", max: Infinity },
] as const;
export type ContestBand = (typeof CONTEST_BANDS)[number]["name"];

export interface Rate {
  attempts: number;
  made: number;
  /** Made over attempts, NaN with no attempts. */
  pct: number;
}

export interface SimSummary {
  /** Points per possession, free throws included. */
  ppp: number;
  possessions: number;
  byType: Record<ShotType, Rate>;
  /** Jumpers only (twos and threes), by contest band. */
  jumpersByContest: Record<ContestBand, Rate>;
  /** Layups and dunks by contest band. */
  finishesByContest: Record<ContestBand, Rate>;
  stepback: Rate & { meanContest: number; meanSpace: number };
  /** Other jumpers, for the stepback to be read against. */
  otherJumpers: Rate & { meanContest: number; meanSpace: number };
  /** Stepback moves that shook their defender. */
  stepbackShakeRate: number;
}

export function rate(shots: readonly ShotRecord[]): Rate {
  const made = shots.filter((s) => s.made).length;
  return { attempts: shots.length, made, pct: shots.length ? made / shots.length : NaN };
}

const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN);

export function bandOf(contest: number): ContestBand {
  return CONTEST_BANDS.find((b) => contest < b.max)!.name;
}

function byBand(shots: readonly ShotRecord[]): Record<ContestBand, Rate> {
  return {
    open: rate(shots.filter((s) => bandOf(s.contest) === "open")),
    light: rate(shots.filter((s) => bandOf(s.contest) === "light")),
    tight: rate(shots.filter((s) => bandOf(s.contest) === "tight")),
  };
}

function withSpace(shots: readonly ShotRecord[]) {
  return { ...rate(shots), meanContest: mean(shots.map((s) => s.contest)), meanSpace: mean(shots.map((s) => s.space)) };
}

/** Sums up any number of logs into one table. */
export function summarise(logs: readonly ShotLog[]): SimSummary {
  const shots = logs.flatMap((l) => l.shots);
  const points = logs.reduce((s, l) => s + l.points[0] + l.points[1], 0);
  const possessions = logs.reduce((s, l) => s + l.possessions, 0);
  const moves = logs.reduce((s, l) => s + l.stepbackMoves, 0);
  const shakes = logs.reduce((s, l) => s + l.stepbackShakes, 0);
  const of = (t: ShotType) => rate(shots.filter((s) => s.type === t));
  const jumpers = shots.filter((s) => s.type === "two" || s.type === "three");
  return {
    ppp: possessions ? points / possessions : NaN,
    possessions,
    byType: { two: of("two"), three: of("three"), floater: of("floater"), layup: of("layup"), dunk: of("dunk") },
    jumpersByContest: byBand(jumpers),
    finishesByContest: byBand(shots.filter((s) => s.type === "layup" || s.type === "dunk")),
    stepback: withSpace(jumpers.filter((s) => s.stepback)),
    otherJumpers: withSpace(jumpers.filter((s) => !s.stepback)),
    stepbackShakeRate: moves ? shakes / moves : NaN,
  };
}
