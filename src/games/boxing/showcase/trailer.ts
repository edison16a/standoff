import type { MatchEvent } from "../engine/events";
import { Match } from "../engine/match";
import { RULES } from "../engine/rules";
import { defenseOf, type Posture } from "../engine/stance";
import type { FighterId, Hand, Level, PunchStyle } from "../engine/types";

/** The trailer repeats every this many seconds, so the captured clip loops cleanly. */
export const CYCLE_S = 8;
/** Walking in from the corners before the first punch, in match milliseconds. */
const PREROLL_MS = 1_300;
/** Real seconds of the cycle where the knockout blow plays in slow motion. */
const SLOW_FROM = 5.15;
const SLOW_TO = 6.1;
const SLOW = 0.18;

interface Throw {
  at: number;
  fighter: FighterId;
  hand: Hand;
  style: PunchStyle;
  windup: number;
  level?: Level;
}

interface Hold {
  from: number;
  to: number;
  fighter: FighterId;
  posture: Partial<Posture>;
}

/** Match seconds after the walk in: a block, a slip and a counter, a duck, a hook to the body, then the knockout hook. */
const THROWS: readonly Throw[] = [
  { at: 0.3, fighter: 0, hand: "left", style: "jab", windup: 0 },
  { at: 0.85, fighter: 1, hand: "right", style: "cross", windup: 150 },
  { at: 1.3, fighter: 0, hand: "left", style: "jab", windup: 0 },
  { at: 2.0, fighter: 0, hand: "right", style: "cross", windup: 0 },
  { at: 2.55, fighter: 1, hand: "left", style: "hook", windup: 200 },
  { at: 3.15, fighter: 0, hand: "left", style: "hook", windup: 0, level: "body" },
  { at: 3.7, fighter: 1, hand: "left", style: "jab", windup: 100 },
  { at: 4.2, fighter: 0, hand: "left", style: "jab", windup: 0 },
  { at: 4.93, fighter: 0, hand: "right", style: "hook", windup: 140 },
];

const HOLDS: readonly Hold[] = [
  { from: 0.05, to: 0.6, fighter: 1, posture: { shell: "guard" } },
  { from: 0.9, to: 1.35, fighter: 0, posture: { slip: -1 } },
  { from: 4.0, to: 4.5, fighter: 1, posture: { shell: "guard" } },
  // Late, as the hook leaves, so its aim cannot follow the head down.
  { from: 2.7, to: 3.05, fighter: 0, posture: { duck: 1 } },
];

/**
 * A scripted exchange for the showcase: two boxers late in the final
 * round, a block, a slipped cross and a counter jab, a ducked hook, a
 * hook dug in to the body, and a right hook that drops the blue corner
 * in slow motion. Everything
 * goes through the real match rules, so it looks exactly like play.
 */
export class Trailer {
  readonly match: Match;
  private next = 0;
  private knockoutSet = false;

  constructor() {
    this.match = new Match({ seed: 21, introMs: 10, roundMs: 60_000, touch: false });
    this.match.round = RULES.rounds;
    // Late in the fight: both faces show it.
    this.match.fighters[0].stats.damage = 95;
    this.match.fighters[1].stats.damage = 45;
    // No stuns before the last blow, so the exchange plays as written.
    for (const fighter of this.match.fighters) fighter.stunImmuneUntil = Infinity;
  }

  /** Match milliseconds reached at `cycle` real seconds into the loop, with the slow motion. */
  static matchTime(cycle: number): number {
    const normal = Math.min(cycle, SLOW_FROM);
    const slow = Math.max(0, Math.min(cycle, SLOW_TO) - SLOW_FROM);
    const after = Math.max(0, cycle - SLOW_TO);
    return (normal + slow * SLOW + after * 0.75) * 1000;
  }

  /** How fast time runs at this point of the loop, for the particles and the crowd. */
  static speed(cycle: number): number {
    if (cycle >= SLOW_FROM && cycle < SLOW_TO) return SLOW;
    return cycle >= SLOW_TO ? 0.75 : 1;
  }

  /** Moves the fight to `cycle` seconds into the loop. Returns what happened on the way. */
  advanceTo(cycle: number): MatchEvent[] {
    const target = Trailer.matchTime(cycle) + PREROLL_MS;
    const events: MatchEvent[] = [];
    while (this.match.now + 5 <= target) {
      const t = (this.match.now - PREROLL_MS) / 1000;
      this.act(t);
      events.push(...this.match.update(5));
    }
    return events;
  }

  private act(t: number): void {
    for (const id of [0, 1] as const) {
      const posture: Partial<Posture> = {};
      for (const hold of HOLDS) if (hold.fighter === id && t >= hold.from && t < hold.to) Object.assign(posture, hold.posture);
      this.match.setInput(id, defenseOf(posture));
    }
    // The last hook finds a boxer with nothing left.
    if (!this.knockoutSet && t >= 4.9) {
      this.knockoutSet = true;
      this.match.fighters[1].health = 5;
    }
    while (this.next < THROWS.length && t >= THROWS[this.next]!.at) {
      const p = THROWS[this.next++]!;
      this.match.fighters[p.fighter].stamina = 100;
      // Firm but short of a stun, but for the last one, which has everything behind it.
      this.match.throwPunch(p.fighter, p.hand, p.style, this.next === THROWS.length ? 1 : 0.6, p.windup, p.level);
    }
  }
}
