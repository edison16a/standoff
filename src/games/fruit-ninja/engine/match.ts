import { Arena } from "./arena";
import type { Blade } from "./blade";
import { Combos, type ComboDone } from "./combos";
import type { ArenaEvent, MatchEvent, MatchPhase, ScoreReason, Seat } from "./events";
import { KINDS } from "./fruit-kinds";
import type { Vec2 } from "./geometry";
import { Rng } from "./rng";
import { BOMB_CHANCE, FRUIT_RATE, type Settings } from "./settings";
import { Spawner } from "./spawner";
import { COUNTDOWN_S, ENDING_S, POINTS, STUN_S } from "./tuning";

export interface Standing {
  seat: Seat;
  score: number;
}

/**
 * One round, from the countdown to the final whistle. It throws the
 * fruit, lets the blades cut, keeps the scores and runs the clock. The
 * host feeds it the blades and passes its events on to the screen, the
 * sound and the phones.
 */
export class Match {
  phase: MatchPhase = "countdown";
  readonly arena = new Arena();
  readonly scores = new Map<Seat, number>();
  /** Seconds of play so far. */
  elapsed = 0;
  private phaseClock = 0;
  private readonly spawner: Spawner;
  private readonly active = new Set<Seat>();
  private readonly stuns = new Map<Seat, number>();
  private readonly combos = new Combos();

  constructor(
    readonly settings: Settings,
    seats: readonly Seat[],
    seed: number,
    halfWidth: number,
  ) {
    this.arena.halfWidth = halfWidth;
    for (const seat of seats) {
      this.scores.set(seat, 0);
      this.active.add(seat);
    }
    this.spawner = new Spawner(new Rng(seed), { rate: FRUIT_RATE[settings.fruit], bombChance: BOMB_CHANCE[settings.bombs], specials: true });
  }

  /** Whole seconds shown in the countdown, 3 2 1, or 0 once it is over. */
  get countdown(): number {
    return this.phase === "countdown" ? Math.max(1, Math.ceil(COUNTDOWN_S - this.phaseClock)) : 0;
  }

  get secondsLeft(): number {
    return Math.max(0, this.settings.seconds - this.elapsed);
  }

  /** Whether this seat plays in this round, even if its phone has dropped for now. */
  has(seat: Seat): boolean {
    return this.scores.has(seat);
  }

  isActive(seat: Seat): boolean {
    return this.active.has(seat);
  }

  /** A player left or came back mid round. Their score stays either way. */
  setActive(seat: Seat, on: boolean): void {
    if (!this.has(seat)) return;
    if (on) this.active.add(seat);
    else this.active.delete(seat);
  }

  get activeCount(): number {
    return this.active.size;
  }

  stunLeft(seat: Seat): number {
    return this.stuns.get(seat) ?? 0;
  }

  canCut(seat: Seat): boolean {
    const live = this.phase === "playing" || this.phase === "ending";
    return live && this.active.has(seat) && this.stunLeft(seat) <= 0;
  }

  /** Highest score first. Ties keep seat order so the list never flickers. */
  standings(): Standing[] {
    return [...this.scores].map(([seat, score]) => ({ seat, score })).sort((a, b) => b.score - a.score || a.seat - b.seat);
  }

  /** Everyone sharing the top score, or nobody if nobody scored. */
  winners(): Seat[] {
    const top = this.standings()[0]?.score ?? 0;
    return top > 0 ? this.standings().filter((s) => s.score === top).map((s) => s.seat) : [];
  }

  /** Ends the round now, for when every player has left. */
  finish(): MatchEvent[] {
    if (this.phase === "over") return [];
    const events: MatchEvent[] = this.combos.flush().map((combo) => this.comboScore(combo));
    this.phase = "over";
    events.push({ type: "phase", phase: "over" });
    return events;
  }

  step(dt: number, blades: ReadonlyMap<Seat, Blade>): MatchEvent[] {
    const events: MatchEvent[] = [];
    this.phaseClock += dt;
    for (const [seat, left] of this.stuns) {
      if (left - dt <= 0) this.stuns.delete(seat);
      else this.stuns.set(seat, left - dt);
    }
    if (this.phase === "countdown" && this.phaseClock >= COUNTDOWN_S) this.enter("playing", events);

    if (this.phase === "playing") {
      this.elapsed = Math.min(this.settings.seconds, this.elapsed + dt);
      const ctx = { halfWidth: this.arena.halfWidth, elapsed: this.elapsed, remaining: this.secondsLeft, players: this.active.size, bodies: this.arena.bodies };
      for (const launch of this.spawner.step(dt, ctx)) events.push({ type: "spawn", body: this.arena.launch(launch) });
    }

    for (const event of this.arena.step(dt, blades, (seat) => this.canCut(seat))) {
      events.push(event);
      this.score(event, events);
    }
    for (const combo of this.combos.step(dt)) events.push(this.comboScore(combo));

    if (this.phase === "playing" && this.secondsLeft <= 0) this.enter("ending", events);
    else if (this.phase === "ending" && (this.phaseClock >= ENDING_S || (this.phaseClock > 1 && this.arena.bodies.length === 0))) {
      events.push(...this.finish());
    }
    return events;
  }

  private enter(phase: MatchPhase, events: MatchEvent[]): void {
    this.phase = phase;
    this.phaseClock = 0;
    events.push({ type: "phase", phase });
  }

  private score(event: ArenaEvent, events: MatchEvent[]): void {
    switch (event.type) {
      case "slice": {
        const rare = KINDS[event.body.kind].class === "rare";
        events.push(this.add(event.seat, KINDS[event.body.kind].points, rare ? "rare" : "fruit", event.at));
        this.combos.add(event.seat, event.at);
        return;
      }
      case "hit":
        events.push(this.add(event.seat, POINTS.hit, "hit", event.at));
        return;
      case "burst":
        events.push(this.add(event.seat, POINTS.burst, "burst", event.at));
        this.combos.add(event.seat, event.at);
        return;
      case "bomb":
        this.combos.cancel(event.seat);
        this.stuns.set(event.seat, STUN_S);
        events.push({ type: "stun", seat: event.seat, seconds: STUN_S });
        events.push(this.add(event.seat, POINTS.bomb, "bomb", event.at));
        return;
    }
  }

  private comboScore(combo: ComboDone): MatchEvent {
    return this.add(combo.seat, combo.count * POINTS.comboPerFruit, "combo", combo.at, combo.count);
  }

  /** Scores never drop below zero, so a bomb early on is a setback, not a hole. */
  private add(seat: Seat, points: number, reason: ScoreReason, at: Vec2, count?: number): MatchEvent {
    const before = this.scores.get(seat) ?? 0;
    const total = Math.max(0, before + points);
    this.scores.set(seat, total);
    return { type: "score", seat, delta: total - before, total, reason, at, ...(count ? { count } : {}) };
  }
}
