import type { Player } from "@/platform/games/game-api";
import type { Seat } from "@/platform/protocol";
import type { PhoneMessage } from "../protocol";
import { freshSetup, type LobbySeat, type SeatSetup } from "./lobby";

/**
 * What the host remembers about each seat: that it has been used, and
 * how far its phone got through setup. Connection itself is the
 * platform's to know, so it is read fresh from the room each time.
 */
export class SeatBook {
  private readonly setups = new Map<Seat, SeatSetup>();
  /** Seats that have joined at some point, so an empty seat is never listed. */
  readonly known = new Set<Seat>();

  get all(): ReadonlyMap<Seat, SeatSetup> {
    return this.setups;
  }

  seat(seat: Seat): SeatSetup {
    this.known.add(seat);
    let setup = this.setups.get(seat);
    if (!setup) this.setups.set(seat, (setup = freshSetup()));
    return setup;
  }

  /** Applies a phone's message. Returns true when the player just said they are ready. */
  apply(seat: Seat, message: PhoneMessage): boolean {
    const setup = this.seat(seat);
    if (message.kind === "setup") {
      setup.step = message.step;
      // Going back to change the gun or recalibrate means not ready any more.
      if (message.step !== "ready") setup.ready = false;
      return false;
    }
    if (message.kind === "gun") {
      setup.finish = message.finish;
      return false;
    }
    const was = setup.ready;
    // Only a phone past calibration can be ready: its aim has to mean something.
    setup.ready = message.ready && (setup.step === "gun" || setup.step === "ready");
    return setup.ready && !was;
  }

  unready(seat: Seat): void {
    const setup = this.setups.get(seat);
    if (setup) setup.ready = false;
  }

  unreadyAll(): void {
    for (const setup of this.setups.values()) setup.ready = false;
  }

  lobby(players: readonly Player[]): LobbySeat[] {
    return [...this.known]
      .sort((a, b) => a - b)
      .map((seat) => ({ seat, connected: players[seat - 1]?.connected ?? false, ...this.seat(seat) }));
  }
}
