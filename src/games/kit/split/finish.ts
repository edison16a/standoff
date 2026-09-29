/**
 * The words and the finishing order behind the split screen finish card.
 * Kept free of React so the order rules can be tested on their own.
 */

const SUFFIXES = ["th", "st", "nd", "rd"];

/** 1st, 2nd, 3rd, then 4th, 11th, 12th, 13th, 21st and so on. */
export function ordinal(place: number): string {
  const whole = Math.max(1, Math.round(place));
  const teen = whole % 100 >= 11 && whole % 100 <= 13;
  const suffix = teen ? "th" : (SUFFIXES[whole % 10] ?? "th");
  return `${whole}${suffix}`;
}

/** "Edison Law got 1st place!" */
export function finishText(name: string, place: number): string {
  return `${name} got ${ordinal(place)} place!`;
}

/**
 * Places from the order players crossed the line, for games whose HUD
 * only knows who has finished. Feed it every update: someone newly
 * finished takes the next place, and a player who is no longer finished
 * (a new round) gives theirs back. Two finishing in the same update are
 * placed in list order, which is the best a HUD can know.
 */
export class FinishOrder {
  private order: number[] = [];

  update(finished: readonly boolean[]): (number | null)[] {
    this.order = this.order.filter((index) => finished[index] === true);
    finished.forEach((done, index) => {
      if (done && !this.order.includes(index)) this.order.push(index);
    });
    return finished.map((_, index) => {
      const at = this.order.indexOf(index);
      return at < 0 ? null : at + 1;
    });
  }
}
