import type { SoundDirector } from "@/games/fencing/audio/sound-director";
import { Bot } from "@/games/fencing/engine/bot";
import { Engine } from "@/games/fencing/engine/engine";
import type { GameEvent } from "@/games/fencing/engine/events";
import type { CharacterId } from "@/games/fencing/characters";
import type { PerSlot, Slot } from "@/games/fencing/players";
import type { FeedbackEvent, MatchPhase, PhoneMessage } from "@/games/fencing/protocol";
import type { Tuning } from "@/games/fencing/tuning";
import type { MatchHud } from "./host-store";

/** How long a touch plays in slow motion, in real time. */
const SLOW_MO_MS = 1000;
/** How fast the game runs meanwhile. */
const SLOW_MO_RATE = 0.2;

export interface DriverOutputs {
  director: SoundDirector | null;
  /** Buzz one phone. */
  feedback(slot: Slot, event: FeedbackEvent): void;
  /** Tell both phones to reset their strike detectors. */
  recenter(): void;
  onPhase(phase: MatchPhase): void;
}

type EventListener = (event: GameEvent) => void;

/**
 * Runs one match on the host. It owns the engine and fans each game event
 * out to the sound director, the renderer (through `listen`) and the
 * phones' haptics, which is how all three stay in step. In solo play it
 * also runs the computer's fencer.
 *
 * It also owns time. A touch drops the game into slow motion for a
 * moment, then the `impact` cue fires, which is when the renderer throws
 * its big burst and time snaps back to normal.
 */
export class MatchDriver {
  readonly engine: Engine;
  private readonly listeners = new Set<EventListener>();
  private readonly bot: Bot | null;
  private gameTime = 0;
  private lastWall: number | null = null;
  private slowUntil = -Infinity;
  private pendingImpact: Slot | null = null;

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
    switch (message.kind) {
      case "motion":
        this.engine.control(slot, message);
        return;
      case "strike":
        this.engine.strike(slot, message.action);
        return;
      case "rematch":
        this.engine.rematch(slot);
        return;
    }
  }

  tick(wallNow: number): void {
    this.bot?.drive(this.engine);
    const elapsed = this.lastWall === null ? 0 : wallNow - this.lastWall;
    this.lastWall = wallNow;
    if (this.pendingImpact !== null && this.slowUntil === -Infinity) this.slowUntil = wallNow + SLOW_MO_MS;
    this.gameTime += elapsed * (wallNow < this.slowUntil ? SLOW_MO_RATE : 1);
    this.engine.advance(this.gameTime);
    if (this.pendingImpact !== null && wallNow >= this.slowUntil) {
      this.broadcast({ type: "impact", t: this.engine.now, scorer: this.pendingImpact });
      this.pendingImpact = null;
      this.slowUntil = -Infinity;
    }
  }

  hud(): MatchHud {
    const { match } = this.engine;
    return {
      phase: match.phase,
      scores: { ...match.scores },
      countdown: match.countdown(this.engine.now),
      call: match.call,
      winner: match.winner,
      rematchVotes: { ...match.rematchVotes },
    };
  }

  private onPhase(phase: MatchPhase): void {
    if (phase === "enGarde") this.out.recenter();
    this.out.director?.onPhase(phase);
    this.out.onPhase(phase);
  }

  private onEvent(event: GameEvent): void {
    this.broadcast(event);
    // Slow motion starts on the next frame, so the touch itself is drawn at full speed.
    if (event.type === "touch") this.pendingImpact = event.scorer;
    if (event.type === "touch") {
      this.out.feedback(event.scorer, "scored");
      this.out.feedback(event.scorer === 1 ? 2 : 1, "touched");
    }
    if (event.type === "parried") {
      this.out.feedback(event.attacker, "blocked");
      this.out.feedback(event.attacker === 1 ? 2 : 1, "parried");
    }
  }

  private broadcast(event: GameEvent): void {
    this.out.director?.onEvent(event);
    for (const listener of this.listeners) listener(event);
  }
}
