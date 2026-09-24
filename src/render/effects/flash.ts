import type { GameEvent } from "@/game/events";
import type { Palette } from "../palette";

/** How long a flash lasts. Short enough to punctuate, not to distract. */
const FLASH_MS = 180;

type FlashKind = "touch" | "parry";

/**
 * A brief flat wash over the whole strip when a touch's burst goes off
 * (accent) or a parry connects (the text colour). It fades linearly with
 * no easing tricks.
 */
export class Flash {
  private kind: FlashKind | null = null;
  private startedAt = 0;

  /** Times the flash on the event's own clock, so it lines up in slow motion too. */
  react(event: GameEvent): void {
    if (event.type === "impact") this.start("touch", event.t);
    if (event.type === "parried") this.start("parry", event.t);
  }

  draw(ctx: CanvasRenderingContext2D, palette: Palette, now: number, width: number, height: number): void {
    if (!this.kind) return;
    const age = now - this.startedAt;
    if (age < 0 || age > FLASH_MS) {
      this.kind = null;
      return;
    }
    ctx.save();
    ctx.globalAlpha = (1 - age / FLASH_MS) * (this.kind === "touch" ? 0.28 : 0.16);
    ctx.fillStyle = this.kind === "touch" ? palette.accent : palette.text;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  private start(kind: FlashKind, now: number): void {
    this.kind = kind;
    this.startedAt = now;
  }
}
