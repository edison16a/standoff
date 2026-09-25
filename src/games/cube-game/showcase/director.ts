import type { ShowcaseView } from "@/platform/games/game-api";
import { Autoplay } from "../engine/autoplay";
import type { PlayerEvent } from "../engine/player";
import { levelById } from "../levels";
import { GameRenderer, type DrawPlayer } from "../render/game-renderer";
import { beatPulse } from "../render/pulse";

/** What each view shows: a level, from which second of it, and with how many players. */
export interface Plan {
  level: string;
  from: number;
  players: 1 | 2;
  /** The second player starts this many seconds behind, so the halves differ. */
  lag?: number;
  /** Jumps each computer player leaves out, by index into the level's perfect run, to show a crash. */
  skip?: number[][];
  /** Stills: stop the clock at `from`, with sparks and trails already flying. */
  still?: boolean;
}

/** Played silently before the first frame, so trails and sparks are already in the air. */
const PREROLL = 1.2;
const PREROLL_STEP = 1 / 30;

/**
 * Cube Game playing itself for the home screen: computer players on the
 * real levels, drawn by the real renderer. Time comes only from the
 * animation frames, so the capture tool can step it exactly.
 */
export class ShowcaseDirector {
  private readonly renderer: GameRenderer;
  private readonly bots: Autoplay[];
  private start: number | null = null;
  private last = 0;
  private restarted: boolean[];

  constructor(
    canvas: HTMLCanvasElement,
    private readonly plan: Plan,
  ) {
    const level = levelById(plan.level);
    this.renderer = new GameRenderer(canvas);
    this.renderer.setLevel(level);
    this.bots = Array.from({ length: plan.players }, (_, i) => new Autoplay(level, new Set(plan.skip?.[i] ?? [])));
    this.restarted = this.bots.map(() => true);
    for (let t = -PREROLL; t < -1e-6; t += PREROLL_STEP) this.step(t, PREROLL_STEP, false);
  }

  resize(width: number, height: number, pixelRatio: number): void {
    this.renderer.resize(width, height, pixelRatio);
  }

  frame(now: number): void {
    this.start ??= now;
    const elapsed = (now - this.start) / 1000;
    const dt = this.plan.still ? 0 : Math.min(0.1, Math.max(0, elapsed - this.last));
    this.last = elapsed;
    this.step(this.plan.still ? 0 : elapsed, dt, true);
  }

  dispose(): void {
    this.renderer.dispose();
  }

  /** Moves every computer player to `elapsed` seconds after the plan's moment, and draws it. */
  private step(elapsed: number, dt: number, draw: boolean): void {
    const level = this.bots[0]!.level;
    const players: DrawPlayer[] = this.bots.map((bot, i) => {
      const events: PlayerEvent[] = [];
      bot.advanceTo(this.levelTime(i, elapsed), events);
      const restarted = this.restarted[i]!;
      this.restarted[i] = false;
      return { state: bot.run.player, events, attempt: 1, restarted };
    });
    const time = this.levelTime(0, elapsed);
    this.renderer.draw({ time, dt, pulse: beatPulse(time, level.bpm), players, views: players.map((_, i) => i) }, draw);
  }

  private levelTime(player: number, elapsed: number): number {
    return Math.max(0, this.plan.from + elapsed - (player === 1 ? (this.plan.lag ?? 0) : 0));
  }
}

export const PLANS: Record<ShowcaseView, Plan> = {
  loop: { level: "circuit-rush", from: 17.5, players: 1 },
  icon: { level: "first-light", from: 4.6, players: 1, still: true },
  poster: { level: "cloud-hopper", from: 16, players: 1, still: true },
};
