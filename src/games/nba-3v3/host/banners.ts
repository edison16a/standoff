import type { MatchEvent } from "../engine/events";
import type { BannerText } from "./callouts";
import { useNbaStore as store } from "./host-store";
import type { MatchDriver } from "./match-driver";

const BANNER_MS = 1900;

/** The banner across the big screen: each new one replaces the last, and it clears itself. */
export class BannerBoard {
  private key = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  /** A number that changes with every banner, to vary the wording. */
  get count(): number {
    return this.key;
  }

  show(shown: BannerText): void {
    const key = ++this.key;
    store.setState({ banner: { ...shown, key } });
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (store.getState().banner?.key === key) store.setState({ banner: null });
    }, BANNER_MS);
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
  }
}

/** The big moments slow the game for a beat, like a replay as it happens. */
export function slowForMoment(event: MatchEvent, driver: MatchDriver): void {
  if (event.type === "dunk" && event.power > 0.7) driver.slowMo(0.35, 0.55);
  if (event.type === "block") driver.slowMo(0.45, 0.25);
  if (event.type === "shake" && event.hard) driver.slowMo(0.5, 0.3);
  if (event.type === "win") driver.slowMo(0.3, 0.8);
}

/** What the replay lets through to the speakers: the ball, the shoes, the iron and the glass, not the arena's calls. */
export const REPLAY_SOUNDS: ReadonlySet<MatchEvent["type"]> = new Set<MatchEvent["type"]>([
  "bounce", "floor", "squeak", "rim", "board", "net", "dunk", "block", "steal", "pass", "catch", "takeoff", "land", "shake", "fumble",
]);
