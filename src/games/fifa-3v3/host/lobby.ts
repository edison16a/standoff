import type { Entrant } from "../engine/match";
import { CHARACTER_IDS, type CharacterId } from "../roster";
import type { TeamId } from "../teams";

export const TEAM_SIZE = 3;

export interface SeatState {
  connected: boolean;
  pick: CharacterId | null;
  ready: boolean;
  team: TeamId | null;
}

/**
 * Who is in the room, which star each picked, and which side the host
 * put them on. Each star can be taken by one player only. A phone that
 * drops keeps its choices for when it comes back, but while it is away
 * its star is free for someone else.
 */
export class Lobby {
  readonly seats = new Map<number, SeatState>();

  private state(seat: number): SeatState {
    let state = this.seats.get(seat);
    if (!state) {
      state = { connected: false, pick: null, ready: false, team: null };
      this.seats.set(seat, state);
    }
    return state;
  }

  connect(seat: number): void {
    const state = this.state(seat);
    state.connected = true;
    // Someone else took this star while the phone was away.
    if (state.pick && this.taken(seat).includes(state.pick)) {
      state.pick = null;
      state.ready = false;
    }
    if (state.team !== null && this.teamCount(state.team, seat) >= TEAM_SIZE) state.team = null;
  }

  disconnect(seat: number): void {
    this.state(seat).connected = false;
  }

  /** Refused (false) when another player already has that star. */
  pick(seat: number, character: CharacterId): boolean {
    if (this.taken(seat).includes(character)) return false;
    this.state(seat).pick = character;
    return true;
  }

  /** Ready puts a player on the smaller side if the host has not placed them yet. */
  setReady(seat: number, ready: boolean): void {
    const state = this.state(seat);
    state.ready = ready && state.pick !== null && state.connected;
    if (state.ready && state.team === null) state.team = this.smallerTeam(seat);
  }

  /** The host moves a player to a side, if there is room on it. */
  setTeam(seat: number, team: TeamId | null): boolean {
    const state = this.seats.get(seat);
    if (!state) return false;
    if (team !== null && this.teamCount(team, seat) >= TEAM_SIZE) return false;
    state.team = team;
    return true;
  }

  /** Stars held by connected players other than `seat`. */
  taken(seat: number): CharacterId[] {
    const out: CharacterId[] = [];
    for (const [other, s] of this.seats) if (other !== seat && s.connected && s.pick) out.push(s.pick);
    return out;
  }

  /** Connected players on a side, not counting `except`. */
  teamCount(team: TeamId, except?: number): number {
    let n = 0;
    for (const [seat, s] of this.seats) if (seat !== except && s.connected && s.team === team) n++;
    return n;
  }

  private smallerTeam(seat: number): TeamId | null {
    const red = this.teamCount(0, seat);
    const blue = this.teamCount(1, seat);
    if (red >= TEAM_SIZE && blue >= TEAM_SIZE) return null;
    if (red >= TEAM_SIZE) return 1;
    if (blue >= TEAM_SIZE) return 0;
    return blue < red ? 1 : 0;
  }

  /** Connected, ready, and placed on a side: in the next match. */
  get players(): number[] {
    return [...this.seats.entries()]
      .filter(([, s]) => s.connected && s.ready && s.pick && s.team !== null)
      .map(([seat]) => seat)
      .sort((a, b) => a - b);
  }

  get connectedSeats(): number[] {
    return [...this.seats.entries()].filter(([, s]) => s.connected).map(([seat]) => seat).sort((a, b) => a - b);
  }

  /** Stars nobody picked, in roster order, for the computer players. */
  spareStars(): CharacterId[] {
    const used = new Set([...this.seats.values()].filter((s) => s.connected && s.pick).map((s) => s.pick));
    return CHARACTER_IDS.filter((id) => !used.has(id));
  }

  /**
   * The line up: each side's players in seat order, then computer
   * players in the stars nobody picked, up to three a side.
   */
  entrants(): Entrant[] {
    const spare = this.spareStars();
    const out: Entrant[] = [];
    for (const team of [0, 1] as const) {
      const humans = this.players.filter((seat) => this.seats.get(seat)!.team === team).slice(0, TEAM_SIZE);
      for (const seat of humans) out.push({ team, character: this.seats.get(seat)!.pick!, seat });
      for (let i = humans.length; i < TEAM_SIZE; i++) out.push({ team, character: spare.shift() ?? "echeverri", seat: null });
    }
    return out;
  }
}
