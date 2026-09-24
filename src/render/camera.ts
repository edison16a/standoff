import type { SceneFrame } from "@/game/frames";
import { STRIP_HALF_LENGTH } from "@/game/rules";

/** Tallest a fencer gets, sword raised, used to size the view. */
const FIGURE_HEIGHT = 2.3;
/** Room kept on each side of the pair, metres. */
const SIDE_MARGIN = 1.5;
/** How quickly the camera catches up, per second. Slow enough to feel steady. */
const FOLLOW_RATE = 3;

/**
 * Frames the action. It centres on the midpoint between the fencers and
 * zooms so both fit with room to lunge, easing toward that framing rather
 * than jumping, and never shows past the ends of the strip.
 */
export class Camera {
  private centre = 0;
  private scale = 0;
  private lastT: number | null = null;
  width = 1;
  height = 1;

  /** Screen y of the strip surface. */
  get floorY(): number {
    return this.height * 0.74;
  }

  get pixelsPerMetre(): number {
    return this.scale;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.lastT = null;
  }

  follow(frame: SceneFrame): void {
    const [a, b] = frame.fencers;
    const targetCentre = (a.x + b.x) / 2;
    const span = Math.abs(b.x - a.x) + SIDE_MARGIN * 2;
    const targetScale = Math.min((this.height * 0.62) / FIGURE_HEIGHT, this.width / span);

    const dt = this.lastT === null ? Infinity : Math.max(0, frame.t - this.lastT) / 1000;
    this.lastT = frame.t;
    const k = dt === Infinity ? 1 : 1 - Math.exp(-FOLLOW_RATE * dt);
    this.scale += (targetScale - this.scale) * k;
    this.centre += (targetCentre - this.centre) * k;

    // Keep the view on the strip: the ends may show but not the void past them.
    const halfView = this.width / 2 / this.scale;
    const limit = Math.max(0, STRIP_HALF_LENGTH + 0.6 - halfView);
    this.centre = Math.min(limit, Math.max(-limit, this.centre));
  }

  toScreenX(x: number): number {
    return this.width / 2 + (x - this.centre) * this.scale;
  }
}
