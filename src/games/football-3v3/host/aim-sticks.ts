import type { Stick } from "./steer";

/**
 * The QBs' throw sticks while they are held. They stream in often and
 * may drop a message, so each seat keeps its last reading until the
 * phone lets go (a reliable throw message) or leaves. A stick that goes
 * quiet is kept, never thrown: only the phone's own release throws.
 */
export class AimSticks {
  private readonly held = new Map<number, Stick>();

  set(seat: number, stick: Stick): void {
    this.held.set(seat, stick);
  }

  get(seat: number): Stick | null {
    return this.held.get(seat) ?? null;
  }

  clear(seat?: number): void {
    if (seat === undefined) this.held.clear();
    else this.held.delete(seat);
  }
}
