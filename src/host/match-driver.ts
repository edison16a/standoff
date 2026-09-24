import type { SoundDirector } from "@/audio/sound-director";
import { Engine, type EventSource } from "@/game/engine";
import type { GameEvent } from "@/game/events";
import type { CharacterId } from "@/shared/characters";
import type { PerSlot, Slot } from "@/shared/players";
import type { FeedbackEvent, MatchPhase } from "@/shared/protocol";
import type { Tuning } from "@/shared/tuning";
import type { MatchHud } from "./host-store";

export interface DriverOutputs {
  director: SoundDirector | null;
  /** Buzz one phone. */
  feedback(slot: Slot, event: FeedbackEvent): void;
  /** Tell both phones to zero their tracked position. */
  recenter(): void;
  onPhase(phase: MatchPhase): void;
}

type EventListener = (event: GameEvent, source: EventSource) => void;

/**
 * Runs one match on the host. It owns the engine and fans each game event
 * out to the sound director, the renderer (through `listen`) and the
 * phones' haptics, which is how all three stay in step.
 */
export class MatchDriver {
  readonly engine: Engine;
  private readonly listeners = new Set<EventListener>();

  constructor(
    picks: PerSlot<CharacterId>,
    tuning: () => Tuning,
    private readonly out: DriverOutputs,
  ) {
    this.engine = new Engine(picks, tuning, {
      onEvent: (event, source) => this.onEvent(event, source),
      onPhase: (phase) => this.onPhase(phase),
    });
  }

  start(): void {
    this.engine.start();
  }

  /** The renderer subscribes here for flashes. Returns an unsubscribe. */
  listen(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  tick(wallNow: number): void {
    this.engine.advance(wallNow);
  }

  hud(): MatchHud {
    const { match } = this.engine;
    const replay = this.engine.replayProgress;
    return {
      phase: match.phase,
      scores: { ...match.scores },
      countdown: match.countdown(this.engine.now),
      call: match.call,
      winner: match.winner,
      skipVotes: { ...match.skipVotes },
      rematchVotes: { ...match.rematchVotes },
      replay: replay ? { percent: Math.round(replay.progress * 100), slow: replay.slow } : null,
    };
  }

  private onPhase(phase: MatchPhase): void {
    if (phase === "enGarde") this.out.recenter();
    this.out.director?.onPhase(phase);
    this.out.onPhase(phase);
  }

  private onEvent(event: GameEvent, source: EventSource): void {
    this.out.director?.onEvent(event, source);
    for (const listener of this.listeners) listener(event, source);
    if (source !== "live") return;
    if (event.type === "touch") {
      this.out.feedback(event.scorer, "scored");
      this.out.feedback(event.scorer === 1 ? 2 : 1, "touched");
    }
    if (event.type === "parried") {
      this.out.feedback(event.attacker, "blocked");
      this.out.feedback(event.attacker === 1 ? 2 : 1, "parried");
    }
  }
}
