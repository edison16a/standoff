/**
 * How long a round waits for its players to come back after they all
 * drop, so a phone's brief network blip never ends the round.
 */
export const GRACE_MS = 6000;

/**
 * Watches for a round whose players have all gone. It waits out the
 * grace period and checks again before giving up on the round.
 */
export class DropoutWatch {
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly everyoneGone: () => boolean,
    private readonly giveUp: () => void,
  ) {}

  /** Call whenever someone leaves or the room reconnects. */
  check(): void {
    if (this.timer || !this.everyoneGone()) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.everyoneGone()) this.giveUp();
    }, GRACE_MS);
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
