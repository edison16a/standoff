import type { GameEvent } from "@/games/fencing/engine/events";
import type { Slot } from "@/games/fencing/players";
import type { Palette } from "../palette";
import { Confetti } from "./confetti";
import { Flash } from "./flash";
import { ImpactRing } from "./impact-ring";
import { Sparks } from "./sparks";

type Point = { x: number; y: number };

/**
 * Every effect on the strip, fed by the game's event stream. It keeps
 * each blade tip's latest position, because that is where the effects
 * go off: sparks where a parry meets the jab, and the burst where a touch
 * landed.
 */
export class Effects {
  private readonly tips: Record<Slot, Point> = { 1: { x: 0, y: 0 }, 2: { x: 0, y: 0 } };
  private readonly sparks = new Sparks();
  private readonly ring = new ImpactRing();
  private readonly flash = new Flash();
  private readonly confetti = new Confetti();
  /** Where the last touch landed, kept until its burst goes off. */
  private contact: Point | null = null;
  private screen = { width: 1, height: 1 };

  /** Called every frame with each fencer's blade tip, in strip metres. */
  track(slot: Slot, x: number, y: number): void {
    this.tips[slot] = { x, y };
  }

  resize(width: number, height: number): void {
    this.screen = { width, height };
  }

  react(event: GameEvent): void {
    this.flash.react(event);
    switch (event.type) {
      case "parried": {
        // The blades meet just short of the attacker's tip.
        const tip = this.tips[event.attacker];
        this.sparks.burst(tip.x, tip.y, event.t, { count: event.clash ? 46 : 30, speed: 4.2, lifeMs: 420 });
        return;
      }
      case "touch": {
        const tip = this.tips[event.scorer];
        this.contact = { ...tip };
        this.sparks.burst(tip.x, tip.y, event.t, { count: 14, speed: 1.4, lifeMs: 900 });
        return;
      }
      case "impact": {
        const at = this.contact ?? this.tips[event.scorer];
        this.ring.fire(at.x, at.y, event.t);
        this.sparks.burst(at.x, at.y, event.t, { count: 90, speed: 7, lifeMs: 650 });
        this.contact = null;
        return;
      }
      case "matchWon":
        this.confetti.launch(this.screen.width, this.screen.height, performance.now());
        return;
    }
  }

  /** The strip effects, drawn in strip metres over the fencers. */
  drawInStrip(ctx: CanvasRenderingContext2D, palette: Palette, now: number, px: number): void {
    const colours = { accent: palette.spark, text: "#ffffff" };
    this.ring.draw(ctx, palette.spark, now, px);
    this.sparks.draw(ctx, colours, now, px);
  }

  /** The screen wide effects, drawn in CSS pixels over everything. */
  drawOnScreen(ctx: CanvasRenderingContext2D, palette: Palette, now: number): void {
    this.flash.draw(ctx, palette, now, this.screen.width, this.screen.height);
    this.confetti.draw(ctx, palette.confetti, performance.now(), this.screen.height);
  }
}
