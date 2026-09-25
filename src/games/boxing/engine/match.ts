import { finishStoppage, stepCount, knockDown, type Stoppage } from "./count";
import type { MatchEvent, MatchResult } from "./events";
import { Fighter } from "./fighter";
import { FIGHT_RANGE, Footwork } from "./footwork";
import { applyOutcome } from "./landing";
import { seeded, type Random } from "./random";
import { followAim } from "./reach";
import { judge } from "./resolve";
import { endRound, stepBreak, stepIntro, stepTouch, type TouchState } from "./rounds";
import { PUNCHES, RULES } from "./rules";
import { other, type DefenseInput, type FighterId, type Hand, type Level, type PunchStyle } from "./types";

export type MatchPhase = "intro" | "touch" | "fight" | "knockdown" | "stoppage" | "break" | "over";

/** A punch from further apart than fighting range plus this falls short. */
const REACH_SPARE = 0.6;

export interface MatchOptions {
  seed: number;
  rounds?: number;
  roundMs?: number;
  breakMs?: number;
  introMs?: number;
  /** Touch gloves before each round. Off, the boxers start face to face and the bell goes at once. */
  touch?: boolean;
  /** Each boxer's footwork style, by the id of the boxer chosen. */
  styles?: readonly [string | undefined, string | undefined];
}

/**
 * One fight, from the walk to the middle to the final bell. It is the
 * referee: it keeps the clock, judges every punch as it lands, counts
 * knockdowns and scores the rounds. The rounds, the breaks and touching
 * gloves are in `rounds.ts`, the knockdowns in `count.ts`. Pure and
 * seeded, so tests and the showcase can play whole fights without a
 * browser.
 */
export class Match {
  readonly fighters: [Fighter, Fighter] = [new Fighter(0), new Fighter(1)];
  readonly footwork: Footwork;
  readonly random: Random;
  readonly rounds: number;
  readonly roundMs: number;
  readonly breakMs: number;
  readonly touchGloves: boolean;
  phase: MatchPhase = "intro";
  round = 1;
  /** Milliseconds gone in this round. It stops during a count. */
  roundClock = 0;
  /** The match's own clock in milliseconds. It stops while paused. */
  now = 0;
  paused = false;
  result: MatchResult | null = null;
  /** When the current phase began, and when it is due to end. */
  phaseSince = 0;
  phaseEnds: number;
  warned = false;
  touch: TouchState | null = null;
  stoppage: Stoppage | null = null;
  private pending: MatchEvent[] = [{ type: "intro" }];

  constructor(options: MatchOptions) {
    this.random = seeded(options.seed);
    this.rounds = options.rounds ?? RULES.rounds;
    this.roundMs = options.roundMs ?? RULES.roundMs;
    this.breakMs = options.breakMs ?? RULES.breakMs;
    this.touchGloves = options.touch ?? true;
    this.phaseEnds = options.introMs ?? RULES.introMs;
    this.footwork = new Footwork(this.random, options.styles);
    this.footwork.place(this.touchGloves);
    if (this.touchGloves) this.footwork.setMode("centre");
  }

  get secondsLeft(): number {
    return Math.max(0, Math.ceil((this.roundMs - this.roundClock) / 1000));
  }

  /** Milliseconds until the current pause between phases ends, for countdowns on screen. */
  get phaseLeft(): number {
    return Math.max(0, this.phaseEnds - this.now);
  }

  /** Between rounds: walking to the corners, sitting on the stools, or walking back out. */
  get breakStage(): "walk" | "rest" | "out" | null {
    if (this.phase !== "break") return null;
    if (this.now - this.phaseSince < RULES.cornerWalkMs) return "walk";
    return this.phaseLeft < RULES.walkOutMs ? "out" : "rest";
  }

  emit(event: MatchEvent): void {
    this.pending.push(event);
  }

  setPhase(phase: MatchPhase, lengthMs = 0): void {
    this.phase = phase;
    this.phaseSince = this.now;
    this.phaseEnds = this.now + lengthMs;
  }

  setInput(id: FighterId, input: DefenseInput): void {
    this.fighters[id].setInput(input);
  }

  /** Starts a punch. `windupMs` telegraphs it first. Returns false when this boxer cannot punch now. */
  throwPunch(id: FighterId, hand: Hand, style: PunchStyle, power: number, windupMs = 0, level: Level = "head"): boolean {
    const fighter = this.fighters[id];
    if (this.phase !== "fight" || this.paused || !fighter.canPunch(this.now)) return false;
    const spec = PUNCHES[style];
    const tired = fighter.stamina < spec.stamina;
    // Out of stamina or worn down by punishment, the punch takes longer to get there and back.
    const slow = (tired ? 1.3 : 1) * fighter.fatigue.slow;
    fighter.stamina = Math.max(0, fighter.stamina - spec.stamina);
    const counter = fighter.counterOpen(this.now);
    if (counter) fighter.counterUntil = -Infinity;
    const launchAt = this.now + windupMs;
    const impactAt = launchAt + spec.travelMs * slow;
    const aim = { ...this.fighters[other(id)].input.head };
    fighter.punch = { hand, style, level, power, start: this.now, launchAt, impactAt, endAt: impactAt + spec.recoverMs * slow, aim, counter, tired, resolved: false };
    fighter.stats.thrown++;
    this.footwork.threw(id, this.now);
    this.emit({ type: "throw", fighter: id, hand, style, level, windupMs, impactAt, counter, tired });
    return true;
  }

  /** Moves the fight on. Returns everything that happened since the last update. */
  update(dtMs: number): MatchEvent[] {
    if (!this.paused && this.phase !== "over") {
      this.now += dtMs;
      this.footwork.update(dtMs, this.now);
      switch (this.phase) {
        case "intro":
          stepIntro(this);
          break;
        case "touch":
          stepTouch(this);
          break;
        case "break":
          stepBreak(this, dtMs);
          break;
        case "fight":
          this.fight(dtMs);
          break;
        case "knockdown":
          stepCount(this);
          break;
        case "stoppage":
          if (this.now >= this.phaseEnds && this.stoppage) finishStoppage(this);
          break;
      }
    }
    const events = this.pending;
    this.pending = [];
    return events;
  }

  finish(result: MatchResult): void {
    this.result = result;
    this.phase = "over";
    this.emit({ type: "over", result });
  }

  private fight(dtMs: number): void {
    this.roundClock += dtMs;
    for (const fighter of this.fighters) fighter.recover(this.now, dtMs);
    for (const fighter of this.fighters) {
      const punch = fighter.punch;
      if (punch && !punch.resolved) followAim(punch, this.fighters[other(fighter.id)].input.head, this.now, dtMs);
      if (punch && !punch.resolved && this.now >= punch.impactAt) this.land(fighter, this.fighters[other(fighter.id)]);
      if (this.phase !== "fight") return;
    }
    if (!this.warned && this.roundMs - this.roundClock <= RULES.warningMs) {
      this.warned = true;
      this.emit({ type: "warning" });
    }
    if (this.roundClock >= this.roundMs) endRound(this);
  }

  private land(attacker: Fighter, defender: Fighter): void {
    const punch = attacker.punch!;
    punch.resolved = true;
    if (defender.down) return;
    const facts = { fighter: attacker.id, hand: punch.hand, style: punch.style, level: punch.level };
    if (this.footwork.distance() > FIGHT_RANGE + REACH_SPARE) {
      // Still walking in from the corners: it falls short, and earns nobody a counter.
      this.emit({ type: "miss", ...facts, target: defender.id, dodge: null });
      return;
    }
    const outcome = judge(punch, attacker, defender, this.now);
    if (applyOutcome(outcome, punch, attacker, defender, this, (event) => this.emit(event))) knockDown(this, defender, attacker);
  }
}
