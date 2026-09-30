import { ShowcaseDirector } from "./director";
import { ROUND } from "./shots";
import { cutAt, LEAD, type Cut } from "./trailer";

/**
 * Plays the trailer's edit. The round only runs forward, and shots jump
 * about in it, so every cut starts a fresh round played up to its first
 * moment. Every frame then follows from the edit time alone, so the clip
 * repeats exactly on its period and loops unseen.
 */
export class TrailerPlayer {
  private current: Cut | null = null;
  private director: ShowcaseDirector | null = null;
  private size = { width: 1, height: 1, dpr: 1 };

  constructor(private readonly canvas: HTMLCanvasElement) {}

  resize(width: number, height: number, dpr: number): void {
    this.size = { width, height, dpr };
    this.director?.resize(width, height, dpr);
  }

  /** Draws the frame for `seconds` since the scene opened. */
  frame(seconds: number): void {
    const { cut, u } = cutAt(seconds - LEAD);
    if (cut !== this.current || !this.director) {
      this.current = cut;
      this.director?.dispose();
      this.director = new ShowcaseDirector(this.canvas, ROUND);
      this.director.resize(this.size.width, this.size.height, this.size.dpr);
    }
    const time = cut.clock(u);
    this.director.show(time, cut.camera(u, time));
  }

  dispose(): void {
    this.director?.dispose();
  }
}
