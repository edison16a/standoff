import { DEFAULT_BLADE, type BladeId } from "../blades";
import type { Seat } from "../engine/events";
import type { SetupStep } from "../protocol";

export interface SeatSetup {
  /** The setup page the phone is on, or null before it says. */
  step: SetupStep | null;
  blade: BladeId;
  /** Finished setup and waiting to play. */
  ready: boolean;
}

/**
 * What each phone has chosen so far. The platform knows who is connected
 * and what they are called; this knows how far through setup they are.
 */
export class SeatBook {
  private readonly seats = new Map<Seat, SeatSetup>();

  get(seat: Seat): SeatSetup {
    let setup = this.seats.get(seat);
    if (!setup) {
      setup = { step: null, blade: DEFAULT_BLADE, ready: false };
      this.seats.set(seat, setup);
    }
    return setup;
  }

  setStep(seat: Seat, step: SetupStep): void {
    const setup = this.get(seat);
    setup.step = step;
    // Going back to an earlier page means no longer ready.
    if (step !== "ready") setup.ready = false;
  }

  setBlade(seat: Seat, blade: BladeId): void {
    this.get(seat).blade = blade;
  }

  setReady(seat: Seat, ready: boolean): void {
    const setup = this.get(seat);
    setup.ready = ready;
    if (ready) setup.step = "ready";
  }

  /** A phone left. Its blade is remembered for when it comes back, but it must say ready again. */
  leave(seat: Seat): void {
    const setup = this.get(seat);
    setup.ready = false;
    setup.step = null;
  }

  /** Seats that are ready, among those given, in seat order. */
  readyAmong(seats: readonly Seat[]): Seat[] {
    return seats.filter((seat) => this.get(seat).ready).sort((a, b) => a - b);
  }
}
