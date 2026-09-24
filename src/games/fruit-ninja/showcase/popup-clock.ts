/** How long a popup lives in film time, as its CSS animation does in real time. */
const LIFE_S = 1.3;

/**
 * Holds the score popups to the film's clock. The game's popups rise on
 * a CSS animation and leave on a timer, both in real time, but the
 * capture tool steps time by hand, many real seconds per frame, and a
 * still stops time altogether. So each popup is swapped for a copy that
 * this clock owns: its animation is paused and set to its age in film
 * time on every frame, and it goes when it is old enough.
 */
export class PopupClock {
  private readonly born = new Map<Element, number>();

  constructor(private readonly layer: HTMLElement) {}

  /** Call right after the overlay adds a popup, with the film time it appeared. */
  track(time: number): void {
    const el = this.layer.lastElementChild;
    if (!el?.classList.contains("fn-pop") || this.born.has(el)) return;
    const copy = el.cloneNode(true) as Element;
    el.replaceWith(copy);
    this.born.set(copy, time);
  }

  update(time: number): void {
    for (const [el, born] of this.born) {
      const age = time - born;
      if (age > LIFE_S) {
        el.remove();
        this.born.delete(el);
        continue;
      }
      for (const animation of el.getAnimations()) {
        animation.pause();
        animation.currentTime = Math.max(0, age * 1000);
      }
    }
  }

  clear(): void {
    for (const el of this.born.keys()) el.remove();
    this.born.clear();
  }
}
