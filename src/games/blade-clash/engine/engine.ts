import type { CharacterId } from "@/games/blade-clash/characters";
import { SLOTS, type PerSlot, type Slot } from "@/games/blade-clash/players";
import type { MatchPhase } from "@/games/blade-clash/protocol";
import type { Tuning } from "@/games/blade-clash/tuning";
import { Combat } from "./combat";
import type { GameEvent } from "./events";
import { Fighter } from "./fighter";
import { FixedStepClock, TICK_MS } from "./fixed-step";
import type { SceneFrame } from "./frames";
import { Match } from "./match";
import { LINE_HALF_LENGTH, MIN_GAP } from "./rules";
import type { SwordControl } from "./sword";

export interface EngineListener {
  onEvent(event: GameEvent): void;
  onPhase(phase: MatchPhase): void;
}

/** What a phone sends every frame: how the sword is held, and the footwork buttons. */
export interface ControllerInput extends SwordControl {
  move: number;
}

/**
 * The duel on the host: two fighters, their swords and the match clock.
 * The page calls `advance` every animation frame and draws whatever
 * `scene` returns. Phones only say how they hold the sword and which
 * button is down. Every hit and clash is decided here, by the swords
 * themselves meeting in the world.
 */
export class Engine {
  readonly match = new Match();
  readonly fighters: PerSlot<Fighter>;
  private readonly combat = new Combat();
  private clock = 0;
  private readonly stepper = new FixedStepClock();
  private lastCountdown: number | null = null;

  constructor(
    characters: PerSlot<CharacterId>,
    private readonly tuning: () => Tuning,
    private readonly listener: EngineListener,
  ) {
    const timing = () => ({ outMs: this.tuning().knockOutMs, returnMs: this.tuning().knockReturnMs });
    this.fighters = { 1: new Fighter(1, characters[1], timing), 2: new Fighter(2, characters[2], timing) };
  }

  get now(): number {
    return this.clock;
  }

  get phase(): MatchPhase {
    return this.match.phase;
  }

  start(): void {
    this.match.start(this.clock);
    this.onEnter("countdown");
  }

  control(slot: Slot, input: ControllerInput): void {
    const fighter = this.fighters[slot];
    fighter.sword.setTarget(input);
    fighter.move = Math.max(-1, Math.min(1, input.move));
  }

  rematch(slot: Slot): boolean {
    if (!this.match.voteRematch(slot)) return false;
    this.start();
    return true;
  }

  /** A phone dropping mid fight pauses it until the phone is back. */
  setConnected(connected: PerSlot<boolean>): void {
    const before = this.match.phase;
    if (!(connected[1] && connected[2])) this.match.pause(this.clock);
    else this.match.resume(this.clock);
    if (this.match.phase !== before) this.onEnter(this.match.phase);
  }

  /** Runs as many fixed steps as the game clock says have passed. */
  advance(gameNow: number): void {
    const steps = this.stepper.stepsFor(gameNow);
    for (let i = 0; i < steps; i++) this.tick();
  }

  scene(): SceneFrame {
    return { t: this.clock, fighters: [this.fighters[1].frame(this.clock), this.fighters[2].frame(this.clock)] };
  }

  tick(): void {
    this.clock += TICK_MS;
    const phase = this.match.phase;
    const live = phase === "live";
    for (const slot of SLOTS) {
      const fighter = this.fighters[slot];
      fighter.beginTick(TICK_MS, this.clock);
      fighter.settle(this.clock);
      fighter.walk(TICK_MS, live && fighter.action !== "defeat", this.clock);
    }
    this.keepApart();
    if (live) this.fight();
    if (phase === "countdown") this.announceCountdown();
    const entered = this.match.update(this.clock);
    if (entered) this.onEnter(entered);
  }

  private fight(): void {
    for (const slot of SLOTS) {
      const speed = this.fighters[slot].swing(TICK_MS);
      if (speed !== null) this.emit({ type: "swing", t: this.clock, slot, speed });
    }
    const events = this.combat.step(this.fighters, this.match, this.tuning(), this.clock, TICK_MS);
    events.forEach((event) => this.emit(event));
    // A hit pushes the fighter back, which may need the line's ends again.
    this.keepApart();
    if (this.match.phase === "finish") this.onEnter("finish");
  }

  /** Nobody walks through the other or off the end of the line. */
  private keepApart(): void {
    const [left, right] = [this.fighters[1], this.fighters[2]];
    left.x = Math.max(-LINE_HALF_LENGTH, Math.min(left.x, LINE_HALF_LENGTH - MIN_GAP));
    right.x = Math.min(LINE_HALF_LENGTH, Math.max(right.x, -LINE_HALF_LENGTH + MIN_GAP));
    const overlap = MIN_GAP - (right.x - left.x);
    if (overlap <= 0) return;
    // Whoever walked in gets stopped: split the overlap by how hard each pressed forward.
    const pushLeft = Math.max(0, left.speed);
    const pushRight = Math.max(0, right.speed);
    const share = pushLeft + pushRight > 0 ? pushLeft / (pushLeft + pushRight) : 0.5;
    left.x -= overlap * share;
    right.x += overlap * (1 - share);
  }

  private announceCountdown(): void {
    const remaining = this.match.countdown(this.clock);
    if (remaining !== null && remaining !== this.lastCountdown && remaining > 0) {
      this.emit({ type: "countdown", t: this.clock, remaining });
    }
    this.lastCountdown = remaining;
  }

  /** Side effects of entering a phase. */
  private onEnter(phase: MatchPhase): void {
    if (phase === "countdown") {
      for (const slot of SLOTS) {
        this.fighters[slot].reset();
        this.fighters[slot].health = this.match.health[slot];
      }
      this.combat.reset();
      this.lastCountdown = null;
    } else if (phase === "live") {
      this.emit({ type: "fight", t: this.clock });
    } else if (phase === "matchOver") {
      const winner = this.match.winner ?? 1;
      this.fighters[winner].setAction("victory", this.clock);
      this.emit({ type: "matchWon", t: this.clock, winner });
    }
    this.listener.onPhase(phase);
  }

  private emit(event: GameEvent): void {
    this.listener.onEvent(event);
  }
}
