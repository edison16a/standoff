/** How often the cards are measured again, in milliseconds. */
const EVERY = 250;

/**
 * How far the HUD's fighter cards reach up from the bottom of the
 * canvas, in CSS pixels, so the camera can frame the fight above them.
 * The cards only change when they come and go or the window resizes,
 * so the layout is read a few times a second, not every frame.
 */
export class HudInset {
  private next = 0;
  private value = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {}

  read(now: number): number {
    if (now < this.next) return this.value;
    this.next = now + EVERY;
    const cards = this.canvas.parentElement?.querySelector(".bb-cards");
    if (!cards || cards.childElementCount === 0) return (this.value = 0);
    const bottom = this.canvas.getBoundingClientRect().bottom;
    return (this.value = Math.max(0, bottom - cards.getBoundingClientRect().top));
  }
}
