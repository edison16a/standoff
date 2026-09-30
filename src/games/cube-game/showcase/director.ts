import { Autoplay } from "../engine/autoplay";
import type { PlayerEvent } from "../engine/player";
import { levelById } from "../levels";
import { GameRenderer } from "../render/game-renderer";
import { beatPulse } from "../render/pulse";
import { angleAt, continues, cycleOf, placeAt, type Cut } from "./timeline";

/** Played silently before a cut's first frame, so trails and sparks are already in the air. */
const PREROLL = 1.2;
const PREROLL_STEP = 1 / 30;

/**
 * Cube Game playing itself for the home screen: a computer player on the
 * real levels, drawn by the real renderer, cut together like a trailer.
 * Time comes only from the animation frames, so the capture tool can
 * step it exactly, and the cuts repeat, so the clip loops.
 */
export class ShowcaseDirector {
  private readonly renderer: GameRenderer;
  private readonly cycle: number;
  private bot: Autoplay | null = null;
  private start: number | null = null;
  /** Which pass of the cuts and which cut is on screen, so a new one is noticed. */
  private on = "";
  private levelTime = 0;
  private restarted = true;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly cuts: readonly Cut[],
    /** Stills hold the first cut's opening moment, with sparks and trails already flying. */
    private readonly still = false,
  ) {
    this.renderer = new GameRenderer(canvas);
    this.cycle = cycleOf(cuts);
  }

  resize(width: number, height: number, pixelRatio: number): void {
    this.renderer.resize(width, height, pixelRatio);
  }

  frame(now: number, draw = true): void {
    this.start ??= now;
    const elapsed = this.still ? 0 : (now - this.start) / 1000;
    const place = placeAt(this.cuts, elapsed);
    const on = `${Math.floor(elapsed / this.cycle)}:${place.index}`;
    if (on !== this.on) {
      const prev = this.cuts[place.index - 1];
      const carryOn = this.bot !== null && prev !== undefined && this.on.endsWith(`:${place.index - 1}`) && continues(prev, place.cut);
      this.on = on;
      if (!carryOn) this.enter(place.cut);
    }
    this.renderer.setFraming(angleAt(place.cut, place.progress));
    this.step(place.levelTime, draw);
  }

  dispose(): void {
    this.renderer.dispose();
  }

  /** A hard cut: the level from scratch, played up to the cut's moment. */
  private enter(cut: Cut): void {
    const level = levelById(cut.level);
    this.renderer.setLevel(level);
    this.renderer.clearEffects();
    this.bot = new Autoplay(level);
    this.bot.advanceTo(Math.max(0, cut.from - PREROLL));
    this.levelTime = Math.max(0, cut.from - PREROLL);
    this.restarted = true;
    if (cut.settle) this.renderer.setFraming(cut.angle);
    for (let t = this.levelTime + PREROLL_STEP; t < cut.from - 1e-6; t += PREROLL_STEP) this.step(t, false);
  }

  /** Plays on to a level second and draws it. Sparks move with level time, so slow motion slows them too. */
  private step(time: number, draw: boolean): void {
    const bot = this.bot!;
    const dt = Math.max(0, time - this.levelTime);
    this.levelTime = time;
    const events: PlayerEvent[] = [];
    bot.advanceTo(time, events);
    const players = [{ state: bot.run.player, events, attempt: 0, restarted: this.restarted }];
    this.restarted = false;
    this.renderer.draw({ time, dt, pulse: beatPulse(time, bot.level.bpm), players, views: [0] }, draw);
  }
}
