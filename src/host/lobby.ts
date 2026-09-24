import type { CharacterId } from "@/shared/characters";
import { perSlot, type PerSlot, type Slot } from "@/shared/players";

/** One seat as the host sees it before the match starts. */
export interface SeatState {
  connected: boolean;
  pick: CharacterId | null;
  ready: boolean;
}

/**
 * Who is here, who they picked and whether they are ready. Two players
 * cannot pick the same character, so each fencer stays recognisable on
 * the strip. Changing your pick drops your ready flag, so nobody starts a
 * match against a character they did not see.
 */
export class Lobby {
  seats: PerSlot<SeatState> = perSlot(() => ({ connected: false, pick: null, ready: false }));

  connect(slot: Slot): void {
    this.seats[slot] = { ...this.seats[slot], connected: true };
  }

  disconnect(slot: Slot): void {
    this.seats[slot] = { ...this.seats[slot], connected: false };
  }

  /** Returns false if the other player already has that character. */
  pick(slot: Slot, characterId: CharacterId): boolean {
    const other = this.seats[slot === 1 ? 2 : 1];
    if (other.pick === characterId) return false;
    this.seats[slot] = { ...this.seats[slot], pick: characterId, ready: false };
    return true;
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

  /** After a match, everyone has to confirm again before the next one. */
  clearReady(): void {
    this.seats = perSlot((slot) => ({ ...this.seats[slot], ready: false }));
  }
}
