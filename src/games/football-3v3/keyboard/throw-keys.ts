import type { PhoneMessage, PhoneState } from "../protocol";

/**
 * The QB's throw buttons on the keyboard, as the phone's press, slide and
 * release: holding 1 to 4 lights that runner up, pressing another number
 * while held moves the light to him, letting go of the lit number throws
 * to him, and Escape cancels. The light goes to the host only when it
 * changes, and goes out when the throw window closes.
 */
export class ThrowKeys {
  /** The number held for a throw, by slot, or null. */
  private held: number | null = null;
  /** The light the host last heard. */
  private sent: number | null = null;

  constructor(private readonly send: (message: PhoneMessage) => void) {}

  /** A number went down on the QB's pad: light his runner, if that throw can go. */
  down(slot: number, s: PhoneState | null): void {
    if (!s?.canThrow || !s.throws[slot]) return;
    this.held = slot;
    this.sync(s);
  }

  /** A number came up: the lit one throws to its runner, any other does nothing. */
  up(slot: number, s: PhoneState | null): void {
    if (this.held !== slot) return;
    this.held = null;
    if (s?.canThrow && s.throws[slot]) {
      // The throw ends the light on the host too.
      this.sent = null;
      this.send({ kind: "throw", slot });
    }
    this.sync(s);
  }

  /** Escape, or focus lost: nothing is thrown. True when there was a held throw to cancel. */
  cancel(s: PhoneState | null): boolean {
    const had = this.held !== null;
    this.held = null;
    this.sync(s);
    return had;
  }

  /** Each tick: a pass, a sack, a turnover or the whistle ends the hold. */
  update(s: PhoneState | null): void {
    if (this.held !== null && !s?.canThrow) this.held = null;
    this.sync(s);
  }

  private sync(s: PhoneState | null): void {
    const lit = this.held !== null && s?.throws[this.held] ? this.held : null;
    if (lit === this.sent) return;
    this.sent = lit;
    this.send({ kind: "highlight", slot: lit });
  }
}
