import { DEFAULT_BOT_LEVEL, type BotLevel } from "@/games/kit/difficulty/difficulty";
import type { Entrant } from "../engine/match";
import { freeRole, nextRole, type Role } from "../engine/roles";
import { CHARACTER_IDS, type CharacterId } from "../roster";
import type { TeamId } from "../teams";

export const TEAM_SIZE = 3;

export interface SeatState {
  connected: boolean;
  pick: CharacterId | null;
  ready: boolean;
  team: TeamId | null;
  /** The place the host gave them on their side: Striker, Left wing or Right wing. */
  role: Role;
}

/**
 * Who is in the room, which star each picked, and which side the host
 * put them on. Each star can be taken by one player only. A phone that
 * drops keeps its choices for when it comes back, but while it is away
 * its star is free for someone else. Computer players fill the empty
 * places unless the host turns them off; then the sides are just the
 * people, and one side may have more than the other.
 */
export class Lobby {
  readonly seats = new Map<number, SeatState>();
  /** Whether computer players fill the empty places. */
  bots = true;
  /** How good the computer players are. Easy unless the host picks another. */
  level: BotLevel = DEFAULT_BOT_LEVEL;

  private state(seat: number): SeatState {
    let state = this.seats.get(seat);
    if (!state) {
      state = { connected: false, pick: null, ready: false, team: null, role: 0 };
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
    if (state.ready && state.team === null) this.join(seat, this.smallerTeam(seat));
  }

  /** The host moves a player to a side, if there is room on it. */
  setTeam(seat: number, team: TeamId | null): boolean {
    const state = this.seats.get(seat);
    if (!state) return false;
    if (team !== null && this.teamCount(team, seat) >= TEAM_SIZE) return false;
    this.join(seat, team);
    return true;
  }

  /** Joining a side takes the first role free there; the host can change it. */
  private join(seat: number, team: TeamId | null): void {
    const state = this.state(seat);
    if (team !== null && team !== state.team) state.role = freeRole(this.members(team, seat).map((o) => this.state(o).role));
    state.team = team;
  }

  /** The host gives a player the next role; a team mate who had it takes theirs in exchange. */
  cycleRole(seat: number): void {
    const state = this.seats.get(seat);
    if (!state || state.team === null) return;
    const want = nextRole(state.role);
    const holder = this.members(state.team, seat).find((o) => this.state(o).role === want);
    if (holder !== undefined) this.state(holder).role = state.role;
    state.role = want;
  }

  setLevel(level: BotLevel): void {
    this.level = level;
  }

  /** Connected players on a side, not counting `except`. */
  private members(team: TeamId, except: number): number[] {
    return [...this.seats.entries()].filter(([seat, s]) => seat !== except && s.connected && s.team === team).map(([seat]) => seat);
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

  setBots(on: boolean): void {
    this.bots = on;
  }

  /**
   * Why a match cannot start yet, or null when it can. With computer
   * players on, one person is enough; without them each side needs someone.
   */
  startBlock(): "empty" | "oneSided" | null {
    const sides = this.players.map((seat) => this.seats.get(seat)!.team);
    if (sides.length === 0) return "empty";
    if (!this.bots && !(sides.includes(0) && sides.includes(1))) return "oneSided";
    return null;
  }

  /**
   * The line up: each side's players with the roles the host gave them,
   * then computer players in the stars nobody picked and the roles left
   * over, up to three a side when they are on. Each side is listed in
   * role order. The keepers are always the computer's.
   */
  entrants(): Entrant[] {
    const spare = this.spareStars();
    const out: Entrant[] = [];
    for (const team of [0, 1] as const) {
      const humans = this.players.filter((seat) => this.seats.get(seat)!.team === team).slice(0, TEAM_SIZE);
      const side: Entrant[] = [];
      // Two players left on the same role (one joined while the other was away) share it by seat order.
      for (const seat of humans) {
        const s = this.seats.get(seat)!;
        const clash = side.some((e) => e.slot === s.role);
        side.push({ team, character: s.pick!, seat, slot: clash ? freeRole(side.map((e) => e.slot ?? 0)) : s.role });
      }
      if (this.bots) for (let i = humans.length; i < TEAM_SIZE; i++) side.push({ team, character: spare.shift() ?? "echeverri", seat: null, slot: freeRole(side.map((e) => e.slot ?? 0)) });
      out.push(...side.sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0)));
    }
    return out;
  }
}
