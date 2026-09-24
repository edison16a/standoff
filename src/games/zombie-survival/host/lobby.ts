import type { Seat } from "@/platform/protocol";
import type { WeaponId } from "../engine/weapons";

export interface SeatChoice {
  weapon: WeaponId | null;
  ready: boolean;
}

/**
 * Each seat's weapon and ready flag, before and during a run. Choices
 * survive a phone dropping out, so a player who rejoins finds their gun
 * waiting. Changing gun clears ready, so nobody starts with a weapon
 * they did not confirm.
 */
export class Lobby {
  private readonly seats = new Map<Seat, SeatChoice>();

  get(seat: Seat): SeatChoice {
    return this.seats.get(seat) ?? { weapon: null, ready: false };
  }

  pick(seat: Seat, weapon: WeaponId): void {
    const current = this.get(seat);
    if (current.weapon === weapon) return;
    this.seats.set(seat, { weapon, ready: false });
  }

  /** Ready needs a weapon first. Returns whether the flag changed. */
  setReady(seat: Seat, ready: boolean): boolean {
    const current = this.get(seat);
    if (!current.weapon || current.ready === ready) return false;
    this.seats.set(seat, { ...current, ready });
    return true;
  }

  /** Back to the weapon pick after a run, keeping each gun. */
  clearReady(): void {
    for (const [seat, choice] of this.seats) this.seats.set(seat, { ...choice, ready: false });
  }

  /** Connected seats that are ready, in seat order. */
  readySeats(connected: readonly Seat[]): Seat[] {
    return connected.filter((seat) => this.get(seat).ready).sort((a, b) => a - b);
  }

  /** Everyone here is ready, and someone is here. The run starts on its own then. */
  everyoneReady(connected: readonly Seat[]): boolean {
    return connected.length > 0 && connected.every((seat) => this.get(seat).ready);
  }
}
