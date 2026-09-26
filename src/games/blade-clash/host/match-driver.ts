import type { SoundDirector } from "@/games/blade-clash/audio/sound-director";
import type { CharacterId } from "@/games/blade-clash/characters";
import { Bot } from "@/games/blade-clash/engine/bot";
import { Engine } from "@/games/blade-clash/engine/engine";
import type { GameEvent } from "@/games/blade-clash/engine/events";
import { SLOTS, type PerSlot, type Slot } from "@/games/blade-clash/players";
import type { FeedbackEvent, MatchPhase, PhoneMessage } from "@/games/blade-clash/protocol";
import type { Tuning } from "@/games/blade-clash/tuning";
import type { MatchHud } from "./host-store";

/** How long the final hit plays in slow motion, in real time. */
const SLOW_MO_MS = 1200;
/** How fast the game runs meanwhile. */
const SLOW_MO_RATE = 0.2;

export interface DriverOutputs {
  director: SoundDirector | null;
  /** Tell one phone what just happened to its sword, so it can buzz. */
  feedback(slot: Slot, event: FeedbackEvent): void;
  onPhase(phase: MatchPhase): void;
}

type EventListener = (event: GameEvent) => void;

/**
 * Runs one match on the host. It owns the engine and fans each game event
 * out to the sound director, the renderer (through `listen`) and the
 * phones' buzzes, which is how all three stay in step. In solo play it
 * also runs the computer's fighter.
 *
 * It also owns time. The final hit drops the game into slow motion for a
 * moment, then the `finish` cue fires, which is when the renderer throws
 * its big burst and time snaps back to normal.
 */
export class MatchDriver {
  readonly engine: Engine;
  private readonly listeners = new Set<EventListener>();
  private readonly bot: Bot | null;
  private gameTime = 0;
  private lastWall: number | null = null;
  private slowUntil = -Infinity;
  private pendingFinish: Slot | null = null;

  constructor(
    picks: PerSlot<CharacterId>,
    tuning: () => Tuning,
    private readonly out: DriverOutputs,
    /** The seat the computer plays, if any. */
    computer: Slot | null = null,
  ) {
    this.engine = new Engine(picks, tuning, {
      onEvent: (event) => this.onEvent(event),
      onPhase: (phase) => this.onPhase(phase),
    });
    this.bot = computer ? new Bot(computer) : null;
  }

  start(): void {
    this.engine.start();
  }

  /** The renderer subscribes here for its effects. Returns an unsubscribe. */
  listen(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** A phone's input during the match. Lobby messages mean nothing here. */
  input(slot: Slot, message: PhoneMessage): void {
    if (message.kind === "motion") this.engine.control(slot, message);
    if (message.kind === "rematch") this.engine.rematch(slot);
  }

  tick(wallNow: number): void {
    this.bot?.drive(this.engine);
    const elapsed = this.lastWall === null ? 0 : wallNow - this.lastWall;
    this.lastWall = wallNow;
    this.gameTime += elapsed * (wallNow < this.slowUntil ? SLOW_MO_RATE : 1);
    this.engine.advance(this.gameTime);
    if (this.pendingFinish === null) return;
    // The final hit landed during this advance: slow down from the next frame.
    if (this.slowUntil === -Infinity) {
      this.slowUntil = wallNow + SLOW_MO_MS;
      return;
    }
    if (wallNow < this.slowUntil) return;
    this.broadcast({ type: "finish", t: this.engine.now, winner: this.pendingFinish });
    this.pendingFinish = null;
    this.slowUntil = -Infinity;
  }

  hud(): MatchHud {
    const { match } = this.engine;
    return {
      phase: match.phase,
      health: { ...match.health },
      countdown: match.countdown(this.engine.now),
      winner: match.winner,
      rematchVotes: { ...match.rematchVotes },
    };
  }

  private onPhase(phase: MatchPhase): void {
    this.out.director?.onPhase(phase);
    this.out.onPhase(phase);
  }

  private onEvent(event: GameEvent): void {
    this.broadcast(event);
    if (event.type === "hit") {
      this.out.feedback(event.attacker, "landed");
      this.out.feedback(event.victim, "hurt");
      if (event.final) this.pendingFinish = event.attacker;
    }
    if (event.type === "clash") for (const slot of SLOTS) this.out.feedback(slot, "clash");
  }

  private broadcast(event: GameEvent): void {
    this.out.director?.onEvent(event);
    for (const listener of this.listeners) listener(event);
  }
}
