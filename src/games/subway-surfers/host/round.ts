import type { MoveEvent } from "@/games/kit/camera";
import { DEFAULT_DIFFICULTY, difficultyRun, type Difficulty } from "../engine/difficulty";
import type { RunEvent } from "../engine/events";
import { POWER_NAMES } from "../engine/powers";
import { Run } from "../engine/run";
import { Tutorial } from "../engine/tutorial";
import type { Intent } from "./controls";
import type { RunnerHud } from "./store";

/** Seconds a crash plays out before the run counts as over. */
export const CRASH_HOLD_S = 2.4;
/** Seconds of "get ready" after a player who stepped away comes back. */
export const RESUME_S = 2;
/** Seconds a "+points" pop stays up. Points won meanwhile add to the same pop. */
const GAIN_S = 0.9;

export interface RoundOptions {
  /** The tutorial: an empty yard at a jog. */
  practice?: boolean;
  /** How hard the run is: its start, its yard and its score multiplier. */
  difficulty?: Difficulty;
}

/**
 * One run for the player. It pauses while they are out of view, counts
 * them back in when they return, and is over once the crash has played out.
 */
export class Round {
  readonly run: Run;
  readonly tutorial = new Tutorial();
  private away = false;
  /** Seconds until the run goes on again, once the player is back. */
  private resume: number | null = null;
  private banner: { text: string; id: number } | null = null;
  private bannerUntil = 0;
  private time = 0;
  private gain: { amount: number; id: number } | null = null;
  private gainUntil = 0;
  private bonus = 0;
  readonly difficulty: Difficulty;
  private readonly listeners = new Set<(event: RunEvent) => void>();

  constructor(
    readonly seed: number,
    options: RoundOptions = {},
  ) {
    this.difficulty = options.difficulty ?? DEFAULT_DIFFICULTY;
    this.run = new Run(seed, { practice: options.practice, ...difficultyRun(this.difficulty) });
  }

  listen(listener: (event: RunEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Whether the run is held still, waiting for the player. */
  get paused(): boolean {
    return this.away || this.resume !== null;
  }

  setAway(away: boolean): void {
    if (this.run.crashed) return;
    if (away) {
      this.away = true;
      this.resume = null;
    } else if (this.away) {
      this.away = false;
      this.resume = RESUME_S;
    }
  }

  /** Feeds a camera move to the tutorial. True when it ticks off a step. */
  tutorialMove(event: MoveEvent): boolean {
    if (event.type === "lane") return this.tutorial.see({ type: "lane", lane: event.lane });
    if (event.type === "jump" || event.type === "duck") return this.tutorial.see({ type: event.type });
    return false;
  }

  get over(): boolean {
    const crashed = this.run.crashed;
    return !!crashed && this.run.time - crashed.time > CRASH_HOLD_S;
  }

  update(dt: number, intent: Intent | null): void {
    this.time += dt;
    if (this.away) return;
    if (this.resume !== null) {
      this.resume -= dt;
      if (this.resume > 0) return;
      this.resume = null;
    }
    if (intent) this.run.input(intent.lane, intent);
    this.run.update(dt);
    for (const event of this.run.drain()) this.onEvent(event);
    this.popGain();
  }

  hud(name: string): RunnerHud {
    const run = this.run;
    return {
      name,
      score: Math.floor(run.score),
      coins: run.coins,
      multiplier: run.multiplier,
      difficulty: this.difficulty,
      gain: this.time < this.gainUntil ? this.gain : null,
      distance: Math.floor(run.runner.distance),
      powers: run.powers.active().map((kind) => ({ kind, share: run.powers.share(kind) })),
      away: this.away,
      resume: this.resume === null ? null : Math.ceil(this.resume),
      crashed: run.crashed?.cause ?? null,
      banner: this.time < this.bannerUntil ? this.banner : null,
      tutorial: this.tutorial.done,
    };
  }

  /** Shows points from coins and power ups as they land, so it is plain they count. */
  private popGain(): void {
    const bonus = this.run.points.bonus;
    const won = bonus - this.bonus;
    this.bonus = bonus;
    if (won <= 0) return;
    const live = this.gain && this.time < this.gainUntil;
    this.gain = { amount: (live ? this.gain!.amount : 0) + won, id: (this.gain?.id ?? 0) + (live ? 0 : 1) };
    this.gainUntil = this.time + GAIN_S;
  }

  private onEvent(event: RunEvent): void {
    const shout = bannerFor(event);
    if (shout) {
      // A new id each time, so the same shout twice in a row still pops again.
      this.banner = { text: shout, id: (this.banner?.id ?? 0) + 1 };
      this.bannerUntil = this.time + 1.6;
    }
    for (const listener of this.listeners) listener(event);
  }
}

function bannerFor(event: RunEvent): string | null {
  switch (event.type) {
    case "power":
      return POWER_NAMES[event.kind];
    case "saved":
      return "Saved by the board!";
    case "level":
      return `Score x${event.multiplier}`;
    default:
      return null;
  }
}
