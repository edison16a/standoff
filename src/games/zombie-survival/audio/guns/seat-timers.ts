/**
 * Sounds booked ahead for each player's gun, so a plan can be called off.
 * A pump gun fired halfway through loading stops loading, and the shells
 * it would have thumbed in must not be heard. Rather than create every
 * audio node up front and hunt them down to stop them, each sound waits
 * on a timer and is scheduled on the audio clock just before it is due.
 */

/** What a booking belongs to: a reload can be cancelled without touching the pump cycle of the shot that cancelled it. */
export type Booking = "reload" | "cycle";

/** How far ahead of its time a sound is handed to the audio clock. Timers are only good to a few milliseconds. */
const LOOKAHEAD = 0.1;

interface Pending {
  kind: Booking;
  timer: ReturnType<typeof setTimeout>;
}

export class SeatTimers {
  private readonly pending = new Map<number, Pending[]>();

  /** `now` reads the audio clock. */
  constructor(private readonly now: () => number) {}

  /** Plays `play` at audio time `at` for `seat`, unless that seat's `kind` is cancelled first. */
  book(seat: number, kind: Booking, at: number, play: (at: number) => void): void {
    const wait = at - this.now() - LOOKAHEAD;
    if (wait <= 0) {
      play(at);
      return;
    }
    const entry: Pending = {
      kind,
      timer: setTimeout(() => {
        this.drop(seat, entry);
        // A throttled timer can fire late. Better a late click than a missing one.
        play(Math.max(at, this.now()));
      }, wait * 1000),
    };
    const list = this.pending.get(seat) ?? [];
    list.push(entry);
    this.pending.set(seat, list);
  }

  /** Calls off a seat's bookings of `kind`, or all of them. */
  cancel(seat: number, kind?: Booking): void {
    const list = this.pending.get(seat);
    if (!list) return;
    const keep = list.filter((p) => {
      if (kind && p.kind !== kind) return true;
      clearTimeout(p.timer);
      return false;
    });
    this.pending.set(seat, keep);
  }

  /** Calls off everything, for a new stage, a retry or leaving the game. */
  clear(): void {
    for (const seat of this.pending.keys()) this.cancel(seat);
    this.pending.clear();
  }

  private drop(seat: number, entry: Pending): void {
    const list = this.pending.get(seat);
    if (list) this.pending.set(seat, list.filter((p) => p !== entry));
  }
}
