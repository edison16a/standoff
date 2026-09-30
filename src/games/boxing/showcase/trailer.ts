import type { MatchEvent } from "../engine/events";
import { Match } from "../engine/match";
import { RULES } from "../engine/rules";
import { defenseOf, type Posture } from "../engine/stance";
import type { FighterId, Hand, Level, PunchStyle } from "../engine/types";
import { cycleToFight } from "./timeline";

export { CEREMONY_AT, CYCLE_S } from "./timeline";

/** The blue corner goes down this many times in the film; the last is the knockout. */
export const KNOCKDOWNS = 2;

/** Walking in from the corners before the first punch, in match milliseconds. */
const PREROLL_MS = 1_300;
/** Fight seconds where each knockdown's blow is thrown: the body shot that drops him first, then the hook that ends it. */
const FIRST_DOWN_AT = 3.15;
const KNOCKOUT_AT = 9.2;

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

/** Fight seconds after the walk in. The count after the first knockdown is cut out of the film. */
const THROWS: readonly Throw[] = [
  { at: 0.3, fighter: 0, hand: "left", style: "jab", windup: 0 },
  { at: 0.85, fighter: 1, hand: "right", style: "cross", windup: 150 },
  { at: 1.3, fighter: 0, hand: "left", style: "jab", windup: 0 },
  { at: 2.0, fighter: 0, hand: "right", style: "cross", windup: 0 },
  { at: 2.55, fighter: 1, hand: "left", style: "hook", windup: 200 },
  { at: FIRST_DOWN_AT, fighter: 0, hand: "left", style: "hook", windup: 0, level: "body" },
  { at: KNOCKOUT_AT - 1.2, fighter: 1, hand: "left", style: "jab", windup: 100 },
  { at: KNOCKOUT_AT - 0.7, fighter: 0, hand: "left", style: "jab", windup: 0 },
  { at: KNOCKOUT_AT, fighter: 0, hand: "right", style: "hook", windup: 140 },
];

const HOLDS: readonly Hold[] = [
  { from: 0.05, to: 0.6, fighter: 1, posture: { shell: "guard" } },
  { from: 0.9, to: 1.35, fighter: 0, posture: { slip: -1 } },
  // Late, as the hook leaves, so its aim cannot follow the head down.
  { from: 2.7, to: 3.05, fighter: 0, posture: { duck: 1 } },
  // Both gloves up on the count, to beat it.
  { from: FIRST_DOWN_AT + 1.8, to: FIRST_DOWN_AT + 2.6, fighter: 1, posture: { raise: true } },
  { from: KNOCKOUT_AT - 0.9, to: KNOCKOUT_AT - 0.4, fighter: 1, posture: { shell: "guard" } },
];

/**
 * A scripted fight for the showcase: two boxers late in the final round,
 * a block, a slipped cross and a counter jab, a ducked hook, a hook dug
 * in to the body that drops the blue corner, and once he has beaten the
 * count a right hook that drops him again in slow motion. Everything
 * goes through the real match rules, so it looks exactly like play.
 */
export class Trailer {
  readonly match: Match;
  private next = 0;

  constructor() {
    this.match = new Match({ seed: 21, introMs: 10, roundMs: 60_000, touch: false });
    this.match.round = RULES.rounds;
    // Late in the fight: both faces show it.
    this.match.fighters[0].stats.damage = 95;
    this.match.fighters[1].stats.damage = 45;
    // No stuns, so the exchange plays as written.
    for (const fighter of this.match.fighters) fighter.stunImmuneUntil = Infinity;
  }

  /** Match milliseconds reached at `cycle` real seconds into the loop. */
  static matchTime(cycle: number): number {
    return cycleToFight(cycle) * 1000;
  }

  /** Moves the fight to `cycle` seconds into the loop. Returns what happened on the way. */
  advanceTo(cycle: number): MatchEvent[] {
    return this.advanceToMatch(Trailer.matchTime(cycle));
  }

  /** Moves the fight to `ms` match milliseconds after the walk in, in the rules' own small steps. */
  advanceToMatch(ms: number): MatchEvent[] {
    const target = ms + PREROLL_MS;
    const events: MatchEvent[] = [];
    while (this.match.now + 5 <= target) {
      this.act((this.match.now - PREROLL_MS) / 1000);
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
    while (this.next < THROWS.length && t >= THROWS[this.next]!.at) {
      const p = THROWS[this.next++]!;
      const drops = p.at === FIRST_DOWN_AT || p.at === KNOCKOUT_AT;
      // Each knockdown blow finds a boxer with nothing left.
      if (drops) this.match.fighters[1].health = 5;
      this.match.fighters[p.fighter].stamina = 100;
      // Firm but short of a stun, but for the knockdown blows, which have everything behind them.
      this.match.throwPunch(p.fighter, p.hand, p.style, drops ? 1 : 0.6, p.windup, p.level);
    }
  }
}
