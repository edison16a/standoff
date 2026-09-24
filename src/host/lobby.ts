import type { CharacterId } from "@/shared/characters";
import { otherSlot, perSlot, SLOTS, type PerSlot, type Slot } from "@/shared/players";

/** One seat as the host sees it before the match starts. */
export interface SeatState {
  connected: boolean;
  pick: CharacterId | null;
  ready: boolean;
  /** The seat is played by the computer, for solo play. */
  computer: boolean;
}

/** The fencers the computer likes, in order. It takes the first one free. */
const COMPUTER_PICKS: readonly CharacterId[] = ["iron", "marrow", "duchess", "vale"];

const emptySeat = (): SeatState => ({ connected: false, pick: null, ready: false, computer: false });

/**
 * Who is here, who they picked and whether they are ready. Two players
 * cannot pick the same character, so each fencer stays recognisable on
 * the strip. Changing your pick drops your ready flag, so nobody starts a
 * match against a character they did not see.
 */
export class Lobby {
  seats: PerSlot<SeatState> = perSlot(emptySeat);

  connect(slot: Slot): void {
    this.seats[slot] = { ...this.seats[slot], connected: true };
  }

  disconnect(slot: Slot): void {
    this.seats[slot] = { ...this.seats[slot], connected: false };
  }

  /**
   * Returns false if the other player already has that character. The
   * computer is never in the way: it just switches to another one.
   */
  pick(slot: Slot, characterId: CharacterId): boolean {
    const other = this.seats[otherSlot(slot)];
    if (other.pick === characterId && !other.computer) return false;
    this.seats[slot] = { ...this.seats[slot], pick: characterId, ready: false };
    if (other.pick === characterId) this.seats[otherSlot(slot)] = { ...other, pick: this.spareFor(otherSlot(slot)) };
    return true;
  }

  /**
   * Seats the computer opposite the one player here, or sends it away.
   * With nobody here there is no one to play it, so it waits.
   */
  setComputer(on: boolean): void {
    const computer = this.computerSlot;
    if (!on && computer) this.unseatComputer(computer);
    const free = SLOTS.find((slot) => !this.seats[slot].connected);
    if (on && !computer && free && this.seats[otherSlot(free)].connected) this.seatComputer(free);
  }

  /** Sits the computer in an empty seat, picked and ready. */
  seatComputer(slot: Slot): boolean {
    if (this.seats[slot].connected) return false;
    this.seats[slot] = { connected: true, pick: this.spareFor(slot), ready: true, computer: true };
    return true;
  }

  /** Frees the computer's seat, for a real player or to stop solo play. */
  unseatComputer(slot: Slot): boolean {
    if (!this.seats[slot].computer) return false;
    this.seats[slot] = emptySeat();
    return true;
  }

  get computerSlot(): Slot | null {
    return this.seats[1].computer ? 1 : this.seats[2].computer ? 2 : null;
  }

  private spareFor(slot: Slot): CharacterId {
    const taken = this.seats[otherSlot(slot)].pick;
    return COMPUTER_PICKS.find((id) => id !== taken) ?? "iron";
  }

  setReady(slot: Slot, ready: boolean): void {
    if (ready && !this.seats[slot].pick) return;
    this.seats[slot] = { ...this.seats[slot], ready };
  }

  /** Both here, both picked, both ready. */
  get canStart(): boolean {
    return ([1, 2] as const).every((slot) => {
      const seat = this.seats[slot];
      return seat.connected && seat.pick !== null && seat.ready;
    });
  }

  /** The characters for the engine. Only meaningful once `canStart` is true. */
  get picks(): PerSlot<CharacterId> {
    return { 1: this.seats[1].pick ?? "vale", 2: this.seats[2].pick ?? "iron" };
  }

  /** After a match, every person has to confirm again before the next one. */
  clearReady(): void {
    this.seats = perSlot((slot) => ({ ...this.seats[slot], ready: this.seats[slot].computer }));
  }
}
