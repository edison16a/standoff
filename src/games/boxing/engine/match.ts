import type { MatchEvent, MatchResult } from "./events";
import { Fighter } from "./fighter";
import { FIGHT_RANGE, Footwork } from "./footwork";
import { seeded, type Random } from "./random";
import { judge } from "./resolve";
import { PUNCHES, RULES } from "./rules";
import { decision, scorecards } from "./scoring";
import { other, type DefenseInput, type FighterId, type Hand, type PunchStyle } from "./types";

export type MatchPhase = "intro" | "fight" | "knockdown" | "stoppage" | "break" | "over";

/** A punch from further apart than fighting range plus this falls short. */
const REACH_SPARE = 0.6;
const WALK_OUT_MS = 1_800;

export interface MatchOptions {
  seed: number;
  rounds?: number;
  roundMs?: number;
  breakMs?: number;
  introMs?: number;
}

/**
 * One fight, from the walk to the middle to the final bell. It is the
 * referee: it keeps the clock, judges every punch as it lands, counts
 * knockdowns and scores the rounds. Pure and seeded, so tests and the
 * showcase can play whole fights without a browser.
 */
export class Match {
  readonly fighters: [Fighter, Fighter] = [new Fighter(0), new Fighter(1)];
  readonly footwork: Footwork;
  readonly random: Random;
  readonly rounds: number;
  readonly roundMs: number;
  phase: MatchPhase = "intro";
  round = 1;
  /** Milliseconds gone in this round. It stops during a count. */
  roundClock = 0;
  /** The match's own clock in milliseconds. It stops while paused. */
  now = 0;
  paused = false;
  result: MatchResult | null = null;
  private phaseEnds: number;
  private readonly breakMs: number;
  private warned = false;
  private pending: MatchEvent[] = [{ type: "intro" }];
  private stoppage: { fighter: FighterId; method: "KO" | "TKO" } | null = null;

  constructor(options: MatchOptions) {
    this.random = seeded(options.seed);
    this.rounds = options.rounds ?? RULES.rounds;
    this.roundMs = options.roundMs ?? RULES.roundMs;
    this.breakMs = options.breakMs ?? RULES.breakMs;
    this.phaseEnds = options.introMs ?? RULES.introMs;
    this.footwork = new Footwork(this.random);
    this.footwork.place();
  }

  get secondsLeft(): number {
    return Math.max(0, Math.ceil((this.roundMs - this.roundClock) / 1000));
  }

  /** Milliseconds until the current pause between phases ends, for countdowns on screen. */
  get phaseLeft(): number {
    return Math.max(0, this.phaseEnds - this.now);
  }

  setInput(id: FighterId, input: DefenseInput): void {
    this.fighters[id].setInput(input, this.now);
  }

  /** Starts a punch. `windupMs` telegraphs it first. Returns false when this boxer cannot punch now. */
  throwPunch(id: FighterId, hand: Hand, style: PunchStyle, power: number, windupMs = 0): boolean {
    const fighter = this.fighters[id];
    if (this.phase !== "fight" || this.paused || !fighter.canPunch(this.now)) return false;
    const spec = PUNCHES[style];
    const tired = fighter.stamina < spec.stamina;
    const slow = tired ? 1.3 : 1;
    fighter.stamina = Math.max(0, fighter.stamina - spec.stamina);
    const counter = fighter.counterOpen(this.now);
    if (counter) fighter.counterUntil = -Infinity;
    const impactAt = this.now + windupMs + spec.travelMs * slow;
    fighter.punch = { hand, style, power, start: this.now, impactAt, endAt: impactAt + spec.recoverMs * slow, counter, tired, resolved: false };
    fighter.stats.thrown++;
    this.pending.push({ type: "throw", fighter: id, hand, style, windupMs, impactAt, counter, tired });
    return true;
  }

  /** Moves the fight on. Returns everything that happened since the last update. */
  update(dtMs: number): MatchEvent[] {
    if (!this.paused && this.phase !== "over") {
      this.now += dtMs;
      this.footwork.update(dtMs, this.now);
      switch (this.phase) {
        case "intro":
        case "break":
          // Out of the corners a little before the bell, so they meet in the middle as it rings.
          if (this.phase === "break" && this.phaseLeft < WALK_OUT_MS) this.footwork.setMode("fight");
          if (this.now >= this.phaseEnds) this.startRound();
          break;
        case "fight":
          this.fight(dtMs);
          break;
        case "knockdown":
          this.count();
          break;
        case "stoppage":
          if (this.now >= this.phaseEnds && this.stoppage) this.finishStoppage();
          break;
      }
    }
    const events = this.pending;
    this.pending = [];
    return events;
  }

  private fight(dtMs: number): void {
    this.roundClock += dtMs;
    for (const fighter of this.fighters) fighter.recover(this.now, dtMs);
    for (const fighter of this.fighters) {
      const punch = fighter.punch;
      if (punch && !punch.resolved && this.now >= punch.impactAt) this.land(fighter, this.fighters[other(fighter.id)]);
      if (this.phase !== "fight") return;
    }
    if (!this.warned && this.roundMs - this.roundClock <= RULES.warningMs) {
      this.warned = true;
      this.pending.push({ type: "warning" });
    }
    if (this.roundClock >= this.roundMs) this.endRound();
  }

  private land(attacker: Fighter, defender: Fighter): void {
    const punch = attacker.punch!;
    punch.resolved = true;
    if (defender.down) return;
    const facts = { fighter: attacker.id, hand: punch.hand, style: punch.style };
    if (this.footwork.distance() > FIGHT_RANGE + REACH_SPARE) {
      // Still walking in from the corners: it falls short, and earns nobody a counter.
      this.pending.push({ type: "miss", ...facts, target: defender.id, dodge: null });
      return;
    }
    const outcome = judge(punch, attacker, defender, this.now);
    if (outcome.kind === "miss" || outcome.kind === "block") {
      if (outcome.kind === "miss") {
        defender.stats.dodged++;
        attacker.stamina = Math.max(0, attacker.stamina - RULES.missStamina);
        this.pending.push({ type: "miss", ...facts, target: defender.id, dodge: outcome.dodge });
      } else {
        defender.stats.blocked++;
        defender.stamina = Math.max(0, defender.stamina - RULES.blockStamina);
        defender.health = Math.max(1, defender.health - PUNCHES[punch.style].damage * RULES.blockDamage);
        this.pending.push({ type: "block", ...facts, target: defender.id });
      }
      defender.counterUntil = this.now + RULES.counterMs;
      defender.counterFrom = outcome.kind === "miss" ? "dodge" : "block";
      this.pending.push({ type: "counter", fighter: defender.id, from: defender.counterFrom });
      return;
    }
    const { damage, heavy, stagger } = outcome;
    defender.health = Math.max(0, defender.health - damage);
    defender.rockedUntil = this.now + (heavy ? RULES.heavyRockMs : RULES.rockMs);
    if (stagger) defender.staggerUntil = this.now + RULES.staggerMs;
    defender.counterUntil = -Infinity;
    defender.lastHit = { at: this.now, hand: punch.hand, style: punch.style, damage };
    attacker.stats.landed++;
    attacker.stats.damage += damage;
    if (punch.counter) attacker.stats.counters++;
    attacker.addRoundDamage(this.round, damage);
    this.footwork.knockBack(defender.id, heavy ? 1.5 : 0.6);
    this.pending.push({ type: "hit", ...facts, target: defender.id, damage, counter: punch.counter, heavy, stagger, power: punch.power });
    // Getting hit first spoils a punch still on its way, unless the two land together.
    const theirs = defender.punch;
    if (theirs && !theirs.resolved && theirs.impactAt > this.now + 40) {
      defender.punch = null;
      this.pending.push({ type: "interrupted", fighter: defender.id, hand: theirs.hand, style: theirs.style });
    }
    if (defender.health <= 0) this.knockDown(defender, attacker);
  }

  private knockDown(down: Fighter, by: Fighter): void {
    down.knockdowns++;
    down.stats.knockdowns++;
    down.addRoundKnockdown(this.round);
    const final = down.knockdowns >= RULES.knockdownsToStop;
    down.down = { since: this.now, count: 0, nextCountAt: this.now + RULES.fallMs, raisedSince: null, risingAt: null, final };
    for (const fighter of this.fighters) fighter.punch = null;
    this.footwork.setMode("neutral", down.id);
    this.pending.push({ type: "knockdown", fighter: down.id, by: by.id, knockdowns: down.knockdowns });
    if (final) {
      this.phase = "stoppage";
      this.phaseEnds = this.now + RULES.stoppageMs;
      this.stoppage = { fighter: down.id, method: "TKO" };
    } else {
      this.phase = "knockdown";
    }
  }

  /** The referee's count, and getting up by raising both gloves. */
  private count(): void {
    const down = this.fighters.find((f) => f.down)!;
    const state = down.down!;
    if (state.risingAt !== null) {
      if (this.now < state.risingAt + RULES.riseMs + RULES.resumeMs) return;
      down.down = null;
      down.health = RULES.getUpHealth[Math.min(down.knockdowns, 2) - 1] ?? 30;
      down.staggerUntil = down.rockedUntil = -Infinity;
      this.phase = "fight";
      this.footwork.setMode("fight");
      this.pending.push({ type: "resume" });
      return;
    }
    if (state.count >= 1 && down.input.raise) {
      state.raisedSince ??= this.now;
      if (this.now - state.raisedSince >= RULES.raiseHoldMs) {
        state.risingAt = this.now;
        // The other boxer leaves the neutral corner while this one gets up.
        this.footwork.setMode("fight");
        this.pending.push({ type: "rise", fighter: down.id });
        return;
      }
    } else {
      state.raisedSince = null;
    }
    if (this.now < state.nextCountAt) return;
    state.count++;
    state.nextCountAt += RULES.countMs;
    this.pending.push({ type: "count", fighter: down.id, count: state.count });
    if (state.count >= 10) {
      this.stoppage = { fighter: down.id, method: "KO" };
      this.finishStoppage();
    }
  }

  private finishStoppage(): void {
    const { fighter, method } = this.stoppage!;
    const winner = other(fighter);
    const { cards, totals } = scorecards(this.fighters[0], this.fighters[1], this.round);
    this.pending.push({ type: "stoppage", fighter, by: winner, method });
    this.finish({ winner, method, round: this.round, second: Math.floor(this.roundClock / 1000), cards, totals });
  }

  private startRound(): void {
    if (this.phase === "break") this.round++;
    this.roundClock = 0;
    this.warned = false;
    this.phase = "fight";
    this.footwork.setMode("fight");
    this.pending.push({ type: "round", round: this.round }, { type: "bell", kind: "start" });
  }

  private endRound(): void {
    for (const fighter of this.fighters) fighter.breakReset();
    if (this.round >= this.rounds) {
      this.pending.push({ type: "bell", kind: "final" });
      this.finish(decision(this.fighters[0], this.fighters[1], this.rounds));
      return;
    }
    this.pending.push({ type: "bell", kind: "end" });
    this.phase = "break";
    this.phaseEnds = this.now + this.breakMs;
    this.footwork.setMode("corners");
  }

  private finish(result: MatchResult): void {
    this.result = result;
    this.phase = "over";
    this.pending.push({ type: "over", result });
  }
}
