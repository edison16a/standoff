import type { ShotLog, ShotRecord, ShotType } from "./shot-log";

/** Contest bands as the shot model saw it: open, a hand near, and a hand in the face. */
export const CONTEST_BANDS = [
  { name: "open", max: 0.15 },
  { name: "light", max: 0.4 },
  { name: "tight", max: Infinity },
] as const;
export type ContestBand = (typeof CONTEST_BANDS)[number]["name"];

/**
 * Bands by the nearest defender's distance as the ball left. They do not
 * move when the shot model is retuned, so before and after compare fairly.
 */
export const SPACE_BANDS = [
  { name: "tight", max: 1.1 },
  { name: "close", max: 2 },
  { name: "open", max: Infinity },
] as const;
export type SpaceBand = (typeof SPACE_BANDS)[number]["name"];

export interface Rate {
  attempts: number;
  made: number;
  /** Made over attempts, NaN with no attempts. */
  pct: number;
}

type Spread = Rate & { meanContest: number; meanSpace: number };

export interface SimSummary {
  /** Points per possession, free throws included. */
  ppp: number;
  possessions: number;
  byType: Record<ShotType, Rate>;
  /** Jumpers only (twos and threes), by the contest the model saw. */
  jumpersByContest: Record<ContestBand, Rate>;
  /** Jumpers, layups and dunks by the nearest defender's distance. */
  jumpersBySpace: Record<SpaceBand, Rate>;
  layupsBySpace: Record<SpaceBand, Rate>;
  dunksBySpace: Record<SpaceBand, Rate>;
  stepback: Spread;
  /** Other jumpers, for the stepback to be read against. */
  otherJumpers: Spread;
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

export function spaceOf(space: number): SpaceBand {
  return SPACE_BANDS.find((b) => space < b.max)!.name;
}

function split<B extends string>(shots: readonly ShotRecord[], bands: readonly { name: B }[], of: (s: ShotRecord) => B): Record<B, Rate> {
  return Object.fromEntries(bands.map((b) => [b.name, rate(shots.filter((s) => of(s) === b.name))])) as Record<B, Rate>;
}

function spread(shots: readonly ShotRecord[]): Spread {
  return { ...rate(shots), meanContest: mean(shots.map((s) => s.contest)), meanSpace: mean(shots.map((s) => s.space)) };
}

/** Sums up any number of logs into one table. */
export function summarise(logs: readonly ShotLog[]): SimSummary {
  const shots = logs.flatMap((l) => l.shots);
  const points = logs.reduce((s, l) => s + l.points[0] + l.points[1], 0);
  const possessions = logs.reduce((s, l) => s + l.possessions, 0);
  const moves = logs.reduce((s, l) => s + l.stepbackMoves, 0);
  const shakes = logs.reduce((s, l) => s + l.stepbackShakes, 0);
  const of = (t: ShotType) => shots.filter((s) => s.type === t);
  const jumpers = shots.filter((s) => s.type === "two" || s.type === "three");
  const bySpace = (xs: readonly ShotRecord[]) => split(xs, SPACE_BANDS, (s) => spaceOf(s.space));
  return {
    ppp: possessions ? points / possessions : NaN,
    possessions,
    byType: { two: rate(of("two")), three: rate(of("three")), floater: rate(of("floater")), layup: rate(of("layup")), dunk: rate(of("dunk")) },
    jumpersByContest: split(jumpers, CONTEST_BANDS, (s) => bandOf(s.contest)),
    jumpersBySpace: bySpace(jumpers),
    layupsBySpace: bySpace(of("layup")),
    dunksBySpace: bySpace(of("dunk")),
    stepback: spread(jumpers.filter((s) => s.stepback)),
    otherJumpers: spread(jumpers.filter((s) => !s.stepback)),
    stepbackShakeRate: moves ? shakes / moves : NaN,
  };
}
