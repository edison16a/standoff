import { CHARACTER_IDS, type CharacterId } from "../characters";
import type { Entrant } from "../engine/world";
import { RACE } from "../engine/tuning";

export interface SeatState {
  connected: boolean;
  pick: CharacterId | null;
  ready: boolean;
}

/**
 * Who is in the room and what they chose. Every driver can be taken by
 * one player only, so each kart on the grid looks different. A phone that
 * drops keeps its choice for when it comes back, but while it is away
 * that driver is free for someone else.
 */
export class Lobby {
  readonly seats = new Map<number, SeatState>();

  private state(seat: number): SeatState {
    let state = this.seats.get(seat);
    if (!state) {
      state = { connected: false, pick: null, ready: false };
      this.seats.set(seat, state);
    }
    return state;
  }

  connect(seat: number): void {
    const state = this.state(seat);
    state.connected = true;
    // Someone else took this driver while the phone was away.
    if (state.pick && this.takenBy(state.pick, seat)) {
      state.pick = null;
      state.ready = false;
    }
  }

  /**
   * Ready is kept: only connected seats count as ready, and a phone that
   * blips or reloads mid race should still be on the grid for Race again.
   */
  disconnect(seat: number): void {
    this.state(seat).connected = false;
  }

  /** Refused (false) when another player already has that driver. */
  pick(seat: number, character: CharacterId): boolean {
    if (this.takenBy(character, seat)) return false;
    const state = this.state(seat);
    state.pick = character;
    return true;
  }

  setReady(seat: number, ready: boolean): void {
    const state = this.state(seat);
    state.ready = ready && state.pick !== null && state.connected;
  }

  /** Drivers held by connected players other than `seat`. */
  taken(seat: number): CharacterId[] {
    const out: CharacterId[] = [];
    for (const [other, state] of this.seats) if (other !== seat && state.connected && state.pick) out.push(state.pick);
    return out;
  }

  private takenBy(character: CharacterId, seat: number): boolean {
    return this.taken(seat).includes(character);
  }

  get readySeats(): number[] {
    return [...this.seats.entries()].filter(([, s]) => s.connected && s.ready && s.pick).map(([seat]) => seat).sort((a, b) => a - b);
  }

  get connectedSeats(): number[] {
    return [...this.seats.entries()].filter(([, s]) => s.connected).map(([seat]) => seat).sort((a, b) => a - b);
  }

  /**
   * The grid: computer karts in the drivers nobody picked, up to a full
   * grid when `computers` is on, then every ready player in seat order.
   * Computers start in front, so a solo race is a chase from the first
   * corner.
   */
  entrants(computers: boolean): Entrant[] {
    const players: Entrant[] = this.readySeats.map((seat) => ({ character: this.seats.get(seat)!.pick!, seat }));
    if (!computers) return players;
    const used = new Set(players.map((p) => p.character));
    const spare = CHARACTER_IDS.filter((id) => !used.has(id));
    const bots = spare.slice(0, Math.max(0, RACE.gridSize - players.length)).map((character) => ({ character, seat: null }));
    return [...bots, ...players];
  }
}
