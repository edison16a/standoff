import type { Body } from "../body";
import type { Baseline } from "../calibration";
import { centreOf } from "../spots";

export interface LineOptions {
  /** How slowly the line follows a player at rest, as a time constant in milliseconds. */
  followMs: number;
  /** A change of size bigger than this share means the player came nearer or went back, which it catches up with four times faster. */
  resizeAt: number;
  /** Moving faster than this, in torso lengths per second, is not at rest. */
  restSpeed: number;
}

export const DEFAULT_LINE: LineOptions = { followMs: 2000, resizeAt: 0.12, restSpeed: 0.8 };

/** Where the head is against the line this frame. */
export interface HeadPosition {
  /** How far the head is above the line, in shoulder widths. Negative below it. */
  rise: number;
  /** How far the head and shoulders are right of home, in shoulder widths. Negative to the left. */
  side: number;
  /** The player's size now over the line's size. Above 1 means nearer. */
  ratio: number;
}

/** A head line and its band where they sit in the picture now, for drawing. Picture units, 0 to 1. */
export interface HeadLineView {
  /** The line, down the picture. */
  y: number;
  /** The band's top and bottom edges. A head above the top is a jump, below the bottom a duck. */
  top: number;
  bottom: number;
  /** The player's home across the picture. */
  x: number;
  /** One shoulder width across the picture, in picture widths. */
  width: number;
}

/** The middle of the picture. Coming nearer spreads the picture out from here, as through a lens. */
const CENTRE = 0.5;

/** Where a picture point seen at one size sits when the player is `ratio` times that size. */
const spread = (at: number, ratio: number) => CENTRE + (at - CENTRE) * ratio;

/**
 * One player's head line: where their head rests, set at calibration.
 * Coming nearer the camera makes the player bigger and moves their head
 * away from the middle of the picture, so the line moves with them by
 * the change in shoulder width, at once. On top of that its height and
 * size follow the player slowly while they rest, so it stays true as they
 * settle, and hold still during a move so the move is measured against
 * how they stood before it.
 */
export class HeadLine {
  /** The line and the home, down and across the picture, when the player was `shoulderWidth` wide. */
  private y: number;
  private x: number;
  /** Head to shoulders, for when the head leaves the top of the picture. */
  private gap: number;
  private shoulderWidth: number;

  constructor(baseline: Baseline) {
    this.y = baseline.headY;
    this.x = baseline.centerX;
    this.gap = baseline.shoulderY - baseline.headY;
    this.shoulderWidth = baseline.shoulderWidth;
  }

  measure(body: Body): HeadPosition {
    const ratio = body.shoulderWidth / this.shoulderWidth;
    const head = this.headY(body, ratio);
    return {
      rise: (spread(this.y, ratio) - head) / body.shoulderWidth,
      side: ((centreOf(body) - spread(this.x, ratio)) * body.aspect) / body.shoulderWidth,
      ratio,
    };
  }

  /** The line and band, `up` and `down` shoulder widths either side, at the player's size now. */
  view(body: Body, up: number, down: number): HeadLineView {
    const ratio = body.shoulderWidth / this.shoulderWidth;
    const y = spread(this.y, ratio);
    return { y, top: y - up * body.shoulderWidth, bottom: y + down * body.shoulderWidth, x: spread(this.x, ratio), width: body.shoulderWidth / body.aspect };
  }

  /**
   * Moves the line straight to where the head is now, at the player's size
   * now. For a player who stood up or sat down, whose head is never coming
   * back to the old line. Home across the picture stays, only resized.
   */
  settle(body: Body): void {
    const ratio = body.shoulderWidth / this.shoulderWidth;
    this.x = spread(this.x, ratio);
    this.y = this.headY(body, ratio);
    if (body.headSeen) this.gap = body.shoulders.y - body.head.y;
    else this.gap *= ratio;
    this.shoulderWidth = body.shoulderWidth;
  }

  /** A jump can take the head out of the top of the picture. The shoulders still show where it is. */
  private headY(body: Body, ratio: number): number {
    return body.headSeen ? body.head.y : body.shoulders.y - this.gap * ratio;
  }

  /** Eases the line toward where the player rests now. Only call it while they are not moving. */
  follow(body: Body, stepMs: number, options: LineOptions): void {
    if (stepMs <= 0 || !body.headSeen) return;
    const ratio = body.shoulderWidth / this.shoulderWidth;
    const resized = Math.abs(ratio - 1) > options.resizeAt;
    const k = 1 - Math.exp(-stepMs / (resized ? options.followMs / 4 : options.followMs));
    // Worked at today's size, then taken back to the line's new size.
    const y = spread(this.y, ratio) + (body.head.y - spread(this.y, ratio)) * k;
    const gap = this.gap * ratio + (body.shoulders.y - body.head.y - this.gap * ratio) * k;
    this.shoulderWidth += (body.shoulderWidth - this.shoulderWidth) * k;
    const back = this.shoulderWidth / body.shoulderWidth;
    this.y = spread(y, back);
    // Home across the picture only moves with size. Following the player there would pull a side lane back to the middle.
    this.x = spread(spread(this.x, ratio), back);
    this.gap = gap * back;
  }
}
