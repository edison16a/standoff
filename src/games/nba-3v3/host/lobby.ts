import type { Entry } from "../engine/match";
import type { TeamId } from "../engine/types";
import { DEFAULT_BOT_LEVEL, type BotLevel } from "@/games/kit/difficulty/difficulty";
import { BUILD_IDS, type BuildId } from "../builds";
import { freeRole, nextRole, type Role } from "./roles";

/** How many a side the host can pick: one on one, two on two or three on three. */
export const TEAM_SIZES = [1, 2, 3] as const;
export type TeamSize = (typeof TEAM_SIZES)[number];
export const TEAM_SIZE: TeamSize = 3;

export interface SeatState {
  connected: boolean;
  pick: BuildId | null;
  ready: boolean;
  /** Null while sitting out: both teams are full for the game size. */
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
  build: BuildId;
  role: Role;
}

/**
 * Who is in the room, which build each player picked, and which team the
 * person at the computer put them on. Each build can be taken once. The
 * host picks the game size, one to three a side. New players land on
 * the smaller team, or sit out when both are full; the host moves them
 * with the mouse, and a full team swaps its newest member out so it
 * stays at the size. Computer players fill whatever spots are left,
 * unless the host turns them off: then the teams are just the people,
 * and a team may have fewer players than the other.
 */
export class Lobby {
  readonly seats = new Map<number, SeatState>();
  /** Whether computer players fill the empty spots. */
  bots = true;
  /** How good the computer players are. */
  level: BotLevel = DEFAULT_BOT_LEVEL;
  /** Players a side. */
  size: TeamSize = TEAM_SIZE;
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
    if (s.team === null || this.members(s.team).length > this.size) this.seatSomewhere(seat);
  }

  /** A player whose phone drops keeps their team and pick for when they come back. */
  disconnect(seat: number): void {
    this.state(seat).connected = false;
  }

  pick(seat: number, build: BuildId): boolean {
    if (this.taken(seat).includes(build)) return false;
    this.state(seat).pick = build;
    return true;
  }

  setReady(seat: number, ready: boolean): void {
    const s = this.state(seat);
    s.ready = ready && s.pick !== null && s.connected;
  }

  /**
   * Moves a player to a team. A full team sends its newest member the
   * other way, or to sit out when the player came off the bench.
   */
  setTeam(seat: number, team: TeamId): void {
    const s = this.seats.get(seat);
    if (!s || s.team === team) return;
    const from = s.team;
    const there = this.members(team);
    if (there.length >= this.size) {
      const newest = there.sort((a, b) => this.state(b).placedAt - this.state(a).placedAt)[0]!;
      this.place(newest, from);
    }
    this.place(seat, team);
  }

  /** Deals everyone onto the two teams at random, as evenly as possible; past the size the rest sit out. */
  shuffle(random: () => number = Math.random): void {
    const players = this.connectedSeats.map((seat) => ({ seat, key: random() })).sort((a, b) => a.key - b.key);
    players.forEach(({ seat }, i) => this.place(seat, i < this.size * 2 ? ((i % 2) as TeamId) : null));
  }

  /**
   * Changes the game size. Players past the new size on a team go to the
   * other team if it has room, or sit out; players sitting out come on
   * where there is room again.
   */
  setSize(size: TeamSize): void {
    this.size = size;
    for (const team of [0, 1] as const) {
      const extra = this.members(team).sort((a, b) => this.state(a).placedAt - this.state(b).placedAt).slice(size);
      for (const seat of extra) this.place(seat, null);
    }
    for (const seat of this.bench) this.seatSomewhere(seat);
  }

  /** Connected players sitting out because both teams are full. */
  get bench(): number[] {
    return this.connectedSeats.filter((seat) => this.state(seat).team === null);
  }

  /** Characters held by connected players other than `seat`. */
  taken(seat: number): BuildId[] {
    const out: BuildId[] = [];
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
   * computer players in the builds nobody picked, up to the size when
   * they are on. Players who are still choosing sit this game out.
   */
  spots(): Spot[] {
    const used = new Set(this.readySeats.map((seat) => this.state(seat).pick!));
    const spare = BUILD_IDS.filter((id) => !used.has(id));
    const out: Spot[] = [];
    for (const team of [0, 1] as const) {
      const players = this.readySeats.filter((seat) => this.state(seat).team === team).slice(0, this.size);
      const side: Spot[] = players.map((seat) => ({ team, seat, build: this.state(seat).pick!, role: this.state(seat).role }));
      if (this.bots) {
        for (let i = players.length; i < this.size; i++) side.push({ team, seat: null, build: spare.shift()!, role: freeRole(side.map((s) => s.role)) });
      }
      out.push(...side.sort((a, b) => a.role - b.role));
    }
    return out;
  }

  entries(): Entry[] {
    return this.spots().map((s) => ({ team: s.team, build: s.build, seat: s.seat, slot: s.role }));
  }

  private members(team: TeamId): number[] {
    return this.connectedSeats.filter((seat) => this.state(seat).team === team);
  }

  /** The smaller team when it has room for one more, or sitting out. */
  private seatSomewhere(seat: number): void {
    const a = this.members(0).filter((s) => s !== seat).length;
    const b = this.members(1).filter((s) => s !== seat).length;
    const team: TeamId = a <= b ? 0 : 1;
    this.place(seat, Math.min(a, b) < this.size ? team : null);
  }

  private place(seat: number, team: TeamId | null): void {
    const s = this.state(seat);
    // Joining a team takes the first role free there; the host can change it.
    if (team !== null && s.team !== team) s.role = freeRole(this.members(team).filter((o) => o !== seat).map((o) => this.state(o).role));
    s.team = team;
    s.placedAt = ++this.clock;
  }
}
