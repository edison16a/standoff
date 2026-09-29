import type { Entry } from "../engine/match";
import type { TeamId } from "../engine/types";
import { DEFAULT_BOT_LEVEL, type BotLevel } from "@/games/kit/difficulty/difficulty";
import { CHARACTER_IDS, type CharacterId } from "../roster";
import { freeRole, nextRole, type Role } from "./roles";

export const TEAM_SIZE = 3;

export interface SeatState {
  connected: boolean;
  pick: CharacterId | null;
  ready: boolean;
  team: TeamId | null;
  /** When they were put on their team, so a swap moves the newest arrival. */
  placedAt: number;
  /** The role the host gave them on their team: Guard, Wing or Big. */
  role: Role;
}

/** One spot in a team column: a player, or a computer filling in. */
export interface Spot {
  team: TeamId;
  seat: number | null;
  character: CharacterId;
  role: Role;
}

/**
 * Who is in the room, which star each player picked, and which team the
 * person at the computer put them on. Each star can be taken once. New
 * players land on the smaller team; the host moves them with the mouse,
 * and a full team swaps its newest member across so it stays three a
 * side. Computer players fill whatever spots are left, unless the host
 * turns them off: then the teams are just the people, one a side or more,
 * and a team may have more players than the other.
 */
export class Lobby {
  readonly seats = new Map<number, SeatState>();
  /** Whether computer players fill the empty spots. */
  bots = true;
  /** How good the computer players are. */
  level: BotLevel = DEFAULT_BOT_LEVEL;
  private clock = 0;

  private state(seat: number): SeatState {
    let s = this.seats.get(seat);
    if (!s) {
      s = { connected: false, pick: null, ready: false, team: null, placedAt: 0, role: 0 };
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

  setBots(on: boolean): void {
    this.bots = on;
  }

  setLevel(level: BotLevel): void {
    this.level = level;
  }

  /** The host gives a player the next role; a teammate who had it takes theirs in exchange. */
  cycleRole(seat: number): void {
    const s = this.seats.get(seat);
    if (!s || s.team === null) return;
    const want = nextRole(s.role);
    const other = this.members(s.team).find((o) => o !== seat && this.state(o).role === want);
    if (other !== undefined) this.state(other).role = s.role;
    s.role = want;
  }

  /**
   * Why a game cannot start yet, or null when it can. With computer
   * players on, one person is enough; without them each team needs someone.
   */
  startBlock(): "empty" | "oneSided" | null {
    const spots = this.spots();
    if (!spots.some((s) => s.seat !== null)) return "empty";
    if (!this.bots && ([0, 1] as const).some((team) => !spots.some((s) => s.team === team))) return "oneSided";
    return null;
  }

  /**
   * The spots, team by team: every ready player on their team, then
   * computer players in the stars nobody picked, up to three a side when
   * they are on. Players who are still choosing sit this game out.
   */
  spots(): Spot[] {
    const used = new Set(this.readySeats.map((seat) => this.state(seat).pick!));
    const spare = CHARACTER_IDS.filter((id) => !used.has(id));
    const out: Spot[] = [];
    for (const team of [0, 1] as const) {
      const players = this.readySeats.filter((seat) => this.state(seat).team === team).slice(0, TEAM_SIZE);
      const side: Spot[] = players.map((seat) => ({ team, seat, character: this.state(seat).pick!, role: this.state(seat).role }));
      if (this.bots) {
        for (let i = players.length; i < TEAM_SIZE; i++) side.push({ team, seat: null, character: spare.shift()!, role: freeRole(side.map((s) => s.role)) });
      }
      out.push(...side.sort((a, b) => a.role - b.role));
    }
    return out;
  }

  entries(): Entry[] {
    return this.spots().map((s) => ({ team: s.team, character: s.character, seat: s.seat, slot: s.role }));
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
    // Joining a team takes the first role free there; the host can change it.
    if (s.team !== team) s.role = freeRole(this.members(team).filter((o) => o !== seat).map((o) => this.state(o).role));
    s.team = team;
    s.placedAt = ++this.clock;
  }
}
