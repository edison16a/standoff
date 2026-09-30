import { SurvivalRenderer } from "../render/scene-renderer";
import { CinemaSet } from "./cinema/cinema-set";
import { ShowcaseDirector } from "./director";
import { PLANS } from "./plans";
import { cutAt, LEAD, type Cut } from "./trailer";

/** The game's own view, fighting from the moment it cuts in. */
interface Play {
  director: ShowcaseDirector;
  renderer: SurvivalRenderer;
  lastMs: number;
}

/**
 * Plays the trailer's edit on two canvases: the chase outside on one,
 * the game's own first person view on the other, shown in turn. Every
 * frame is worked out from the edit time alone, and each shot starts
 * fresh, so the clip repeats exactly on its period and loops unseen.
 */
export class TrailerPlayer {
  private readonly set: CinemaSet;
  private current: Cut | null = null;
  private play: Play | null = null;
  private lastStory = 0;
  private size = { width: 1, height: 1, dpr: 1 };

  constructor(
    private readonly outside: HTMLCanvasElement,
    private readonly inside: HTMLCanvasElement,
  ) {
    this.set = new CinemaSet(outside);
  }

  resize(width: number, height: number, dpr: number): void {
    this.size = { width, height, dpr };
    this.set.resize(width, height, dpr);
    this.play?.renderer.resize(width, height, dpr);
  }

  /** Draws the frame for `seconds` since the scene opened. */
  frame(seconds: number): void {
    const { cut, u } = cutAt(seconds - LEAD);
    if (cut !== this.current) this.enter(cut);
    if (cut.kind === "chase") {
      const s = cut.story(u);
      this.set.draw(s, (truck) => cut.camera(u, truck), Math.max(0, s - this.lastStory));
      this.set.finish();
      this.lastStory = s;
      return;
    }
    const play = this.play!;
    const ms = cut.clock(u) * 1000;
    const dt = Math.max(0, (ms - play.lastMs) / 1000);
    play.lastMs = ms;
    play.director.update(ms, play.renderer);
    play.renderer.frame(ms);
    play.renderer.finish();
    play.director.shoot(play.renderer, dt);
  }

  dispose(): void {
    this.leavePlay();
    this.set.dispose();
  }

  private enter(cut: Cut): void {
    this.current = cut;
    this.leavePlay();
    this.outside.style.visibility = cut.kind === "chase" ? "visible" : "hidden";
    this.inside.style.visibility = cut.kind === "play" ? "visible" : "hidden";
    if (cut.kind === "chase") {
      this.set.cut(cut.seed);
      this.lastStory = cut.story(0);
      return;
    }
    // A new fight each time, so the cut in plays the same on every loop.
    const director = new ShowcaseDirector(PLANS.loop);
    const renderer = new SurvivalRenderer(this.inside, director, director.random);
    renderer.resize(this.size.width, this.size.height, this.size.dpr);
    this.play = { director, renderer, lastMs: 0 };
  }

  private leavePlay(): void {
    this.play?.renderer.dispose();
    this.play = null;
  }
}
