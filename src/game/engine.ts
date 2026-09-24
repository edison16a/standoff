import type { CharacterId } from "@/shared/characters";
import { SLOTS, type PerSlot, type Slot } from "@/shared/players";
import type { MatchPhase, StrikeAction } from "@/shared/protocol";
import type { Tuning } from "@/shared/tuning";
import type { GameEvent } from "./events";
import { Fencer, type ControllerInput } from "./fencer";
import { FixedStepClock, TICK_MS } from "./fixed-step";
import type { SceneFrame } from "./frames";
import { Match } from "./match";
import { Referee } from "./referee";
import { Recorder } from "./replay/recorder";
import { REPLAY_LEAD_MS, REPLAY_TAIL_MS, ReplayPlayer } from "./replay/replay-player";
import { clampToStrip, isCorpsACorps, separate } from "./strip";

export type EventSource = "live" | "replay";

export interface EngineListener {
  onEvent(event: GameEvent, source: EventSource): void;
  onPhase(phase: MatchPhase): void;
}

/**
 * The host side game: two fencers, the referee, the match clock and the
 * replay. The page calls `advance` every animation frame and draws
 * whatever `scene` returns. Inputs from the phones arrive through
 * `control` and `strike`, stamped with the engine's own clock, because
 * the phones' clocks cannot be trusted to agree with each other.
 */
export class Engine {
  readonly match: Match;
  readonly fencers: PerSlot<Fencer>;
  private readonly referee: Referee;
  private readonly recorder = new Recorder();
  private replay: { player: ReplayPlayer; startedAt: number } | null = null;
  private clock = 0;
  private readonly stepper = new FixedStepClock();
  private lastCountdown: number | null = null;
  private nextPositions: [number, number] | null = null;

  constructor(
    characters: PerSlot<CharacterId>,
    private readonly tuning: () => Tuning,
    private readonly listener: EngineListener,
  ) {
    this.fencers = { 1: new Fencer(1, characters[1]), 2: new Fencer(2, characters[2]) };
    this.match = new Match(() => this.tuning().replayTimeoutMs);
    this.referee = new Referee(this.fencers, () => this.tuning().parryWindowMs);
  }

  get now(): number {
    return this.clock;
  }

  get phase(): MatchPhase {
    return this.match.phase;
  }

  /** How far through the replay we are, 0 to 1, and whether it is in slow motion. */
  get replayProgress(): { progress: number; slow: boolean } | null {
    if (!this.replay) return null;
    const elapsed = this.clock - this.replay.startedAt;
    return { progress: Math.min(1, elapsed / this.replay.player.durationMs), slow: this.replay.player.isSlow(elapsed) };
  }

  start(): void {
    this.match.start(this.clock);
    this.onEnter("enGarde");
  }

  control(slot: Slot, input: ControllerInput): void {
    this.fencers[slot].input = input;
  }

  strike(slot: Slot, action: StrikeAction): void {
    if (this.match.phase !== "live") return;
    const events = action === "jab" ? this.referee.jab(slot, this.clock) : this.referee.parry(slot, this.clock);
    events.forEach((event) => this.emit(event));
  }

  skip(slot: Slot): void {
    this.match.voteSkip(slot);
  }

  rematch(slot: Slot): boolean {
    if (!this.match.voteRematch(slot)) return false;
    this.start();
    return true;
  }

  /** A phone dropping mid exchange pauses play until it is back. */
  setConnected(connected: PerSlot<boolean>): void {
    const bothHere = connected[1] && connected[2];
    const before = this.match.phase;
    if (!bothHere) this.match.pause(this.clock);
    else this.match.resume(this.clock);
    if (this.match.phase !== before) this.onEnter(this.match.phase);
  }

  /** Runs as many fixed steps as the wall clock says have passed. */
  advance(wallNow: number): void {
    const steps = this.stepper.stepsFor(wallNow);
    for (let i = 0; i < steps; i++) this.tick();
  }

  /** What to draw right now: the live strip, or the replay's frame. */
  scene(): SceneFrame {
    if (this.replay) {
      const frame = this.replay.player.frameAt(this.clock - this.replay.startedAt);
      if (frame) return frame;
    }
    return this.liveFrame();
  }

  tick(): void {
    this.clock += TICK_MS;
    const phase = this.match.phase;
    for (const slot of SLOTS) this.fencers[slot].followPose(TICK_MS);

    if (phase === "live") this.stepLive();
    if (phase === "enGarde") this.announceCountdown();
    if (phase === "live" || phase === "halt") this.recorder.record(this.liveFrame());

    let replayFinished = false;
    if (this.replay) {
      const elapsed = this.clock - this.replay.startedAt;
      this.replay.player.eventsUntil(elapsed).forEach((event) => this.listener.onEvent(event, "replay"));
      replayFinished = this.replay.player.isFinished(elapsed);
    }
    const entered = this.match.update(this.clock, replayFinished);
    if (entered) this.onEnter(entered);
  }

  private stepLive(): void {
    const [left, right] = [this.fencers[1], this.fencers[2]];
    for (const fencer of [left, right]) {
      fencer.walk(TICK_MS, true);
      fencer.x = clampToStrip(fencer.x);
    }
    if (isCorpsACorps(left.x, right.x)) {
      this.nextPositions = separate(left.x, right.x);
      this.emit({ type: "corps", t: this.clock });
      this.match.halt({ kind: "corps" }, this.clock);
      this.onEnter("halt");
      return;
    }
    const { events, verdict } = this.referee.step(this.clock);
    events.forEach((event) => this.emit(event));
    if (!verdict) return;
    if (verdict.kind === "double") {
      this.match.halt({ kind: "double" }, this.clock);
    } else {
      const matchPoint = this.match.isMatchPoint(verdict.scorer);
      this.fencers[verdict.scorer === 1 ? 2 : 1].setAction("hit", verdict.at);
      this.emit({ type: "touch", t: verdict.at, scorer: verdict.scorer, matchPoint });
      this.match.halt({ kind: "touch", scorer: verdict.scorer }, this.clock);
    }
    this.onEnter("halt");
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
    if (phase === "enGarde") {
      const [left, right] = this.nextPositions ?? [this.fencers[1].startX, this.fencers[2].startX];
      this.nextPositions = null;
      this.fencers[1].reset(left);
      this.fencers[2].reset(right);
      this.referee.reset();
      this.recorder.clear();
      this.replay = null;
      this.lastCountdown = null;
    } else if (phase === "live") {
      this.emit({ type: "allez", t: this.clock });
    } else if (phase === "replay") {
      this.startReplay();
    } else if (phase === "matchOver") {
      this.replay = null;
      const winner = this.match.winner ?? 1;
      this.fencers[winner].setAction("victory", this.clock);
      this.fencers[winner === 1 ? 2 : 1].setAction("defeat", this.clock);
      this.emit({ type: "matchWon", t: this.clock, winner });
    }
    this.listener.onPhase(phase);
  }

  /** Cuts the few seconds around the touch out of the recording and plays them. */
  private startReplay(): void {
    const at = this.recorder.last("touch")?.t ?? this.match.phaseStartedAt;
    const clip = this.recorder.slice(at - REPLAY_LEAD_MS, at + REPLAY_TAIL_MS);
    this.replay = { player: new ReplayPlayer(clip.frames, clip.events, at), startedAt: this.clock };
    this.emit({ type: "replayStart", t: this.clock });
  }

  private emit(event: GameEvent): void {
    this.recorder.note(event);
    this.listener.onEvent(event, "live");
  }

  private liveFrame(): SceneFrame {
    return { t: this.clock, fencers: [this.fencers[1].frame(this.clock), this.fencers[2].frame(this.clock)] };
  }
}
