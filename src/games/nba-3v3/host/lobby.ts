import type { Entry } from "../engine/match";
import type { TeamId } from "../engine/types";
import { CHARACTER_IDS, type CharacterId } from "../roster";

export const TEAM_SIZE = 3;

export interface SeatState {
  connected: boolean;
  pick: CharacterId | null;
  ready: boolean;
  team: TeamId | null;
  /** When they were put on their team, so a swap moves the newest arrival. */
  placedAt: number;
}

/** One spot in a team column: a player, or a computer filling in. */
export interface Spot {
  team: TeamId;
  seat: number | null;
  character: CharacterId;
}

/**
 * Who is in the room, which star each player picked, and which team the
 * person at the computer put them on. Each star can be taken once. New
 * players land on the smaller team; the host moves them with the mouse,
 * and a full team swaps its newest member across so it stays three a
 * side. Computer players fill whatever spots are left.
 */
export class Lobby {
  readonly seats = new Map<number, SeatState>();
  private clock = 0;

  private state(seat: number): SeatState {
    let s = this.seats.get(seat);
    if (!s) {
      s = { connected: false, pick: null, ready: false, team: null, placedAt: 0 };
      this.seats.set(seat, s);
    }
    return s;
  }

  connect(seat: number): void {
    const s = this.state(seat);
    s.connected = true;
    if (s.pick && this.taken(seat).includes(s.pick)) {
      s.pick = null;
      s.ready = false;
    }
    if (s.team === null || this.members(s.team).length > TEAM_SIZE) this.place(seat, this.smallerTeam(seat));
  }

  /** A player whose phone drops keeps their team and pick for when they come back. */
  disconnect(seat: number): void {
    this.state(seat).connected = false;
  }

  pick(seat: number, character: CharacterId): boolean {
    if (this.taken(seat).includes(character)) return false;
    this.state(seat).pick = character;
    return true;
  }

  setReady(seat: number, ready: boolean): void {
    const s = this.state(seat);
    s.ready = ready && s.pick !== null && s.connected;
  }

  /** Moves a player to a team. A full team sends its newest member the other way. */
  setTeam(seat: number, team: TeamId): void {
    const s = this.seats.get(seat);
    if (!s || s.team === team) return;
    const from = s.team;
    const there = this.members(team);
    if (there.length >= TEAM_SIZE) {
      const newest = there.sort((a, b) => this.state(b).placedAt - this.state(a).placedAt)[0]!;
      this.place(newest, from ?? (team === 0 ? 1 : 0));
    }
    this.place(seat, team);
  }

  /** Deals everyone onto the two teams at random, as evenly as possible. */
  shuffle(random: () => number = Math.random): void {
    const players = this.connectedSeats.map((seat) => ({ seat, key: random() })).sort((a, b) => a.key - b.key);
    players.forEach(({ seat }, i) => this.place(seat, (i % 2) as TeamId));
  }

  /** Characters held by connected players other than `seat`. */
  taken(seat: number): CharacterId[] {
    const out: CharacterId[] = [];
    for (const [other, s] of this.seats) if (other !== seat && s.connected && s.pick) out.push(s.pick);
    return out;
  }

  get connectedSeats(): number[] {
    return [...this.seats.entries()].filter(([, s]) => s.connected).map(([seat]) => seat).sort((a, b) => a - b);
  }

  get readySeats(): number[] {
    return this.connectedSeats.filter((seat) => {
      const s = this.state(seat);
      return s.ready && s.pick !== null;
    });
  }

  /**
   * The six spots, team by team: every ready player on their team, then
   * computer players in the stars nobody picked. Players who are still
   * choosing show as waiting and sit this game out.
   */
  spots(): Spot[] {
    const used = new Set(this.readySeats.map((seat) => this.state(seat).pick!));
    const spare = CHARACTER_IDS.filter((id) => !used.has(id));
    const out: Spot[] = [];
    for (const team of [0, 1] as const) {
      const players = this.readySeats.filter((seat) => this.state(seat).team === team).slice(0, TEAM_SIZE);
      for (const seat of players) out.push({ team, seat, character: this.state(seat).pick! });
      for (let i = players.length; i < TEAM_SIZE; i++) out.push({ team, seat: null, character: spare.shift()! });
    }
    return out;
  }

  entries(): Entry[] {
    return this.spots().map((s) => ({ team: s.team, character: s.character, seat: s.seat }));
  }

  private members(team: TeamId): number[] {
    return this.connectedSeats.filter((seat) => this.state(seat).team === team);
  }

  private smallerTeam(seat: number): TeamId {
    const a = this.members(0).filter((s) => s !== seat).length;
    const b = this.members(1).filter((s) => s !== seat).length;
    return a <= b ? 0 : 1;
  }

  private place(seat: number, team: TeamId): void {
    const s = this.state(seat);
    s.team = team;
    s.placedAt = ++this.clock;
  }
}
