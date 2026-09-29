import { DEFAULT_BOT_LEVEL, type BotLevel } from "@/games/kit/difficulty/difficulty";
import { MAX_PER_TEAM, MAX_RUNNERS, takeSpare, type Entry } from "../engine/lineup";
import type { LobbyRole } from "../roles";
import { BUILD_IDS, type BuildId } from "../builds";
import type { TeamId } from "../teams";

export const TEAM_SIZE = MAX_PER_TEAM;

export interface SeatState {
  connected: boolean;
  pick: BuildId | null;
  ready: boolean;
  team: TeamId | null;
  /** QB or runner, which the host hands out. Null off a team. */
  role: LobbyRole | null;
}

/**
 * Who is in the room, which build each picked, which side the host put
 * them on and who plays QB. Each build can be taken by one player only.
 * A phone that drops keeps its choices for when it comes back, but while
 * it is away its build is free for someone else. Computer players always
 * fill the places nobody took: a QB for a side with no people, and
 * runners up to two a side.
 */
export class Lobby {
  readonly seats = new Map<number, SeatState>();
  /** How sharp the computer players are. */
  level: BotLevel = DEFAULT_BOT_LEVEL;

  private state(seat: number): SeatState {
    let state = this.seats.get(seat);
    if (!state) {
      state = { connected: false, pick: null, ready: false, team: null, role: null };
      this.seats.set(seat, state);
    }
    return state;
  }

  connect(seat: number): void {
    const state = this.state(seat);
    state.connected = true;
    // Someone else took this build while the phone was away.
    if (state.pick && this.taken(seat).includes(state.pick)) {
      state.pick = null;
      state.ready = false;
    }
    if (state.team !== null && this.teamCount(state.team, seat) >= TEAM_SIZE) state.team = null;
    this.fitRoles();
  }

  disconnect(seat: number): void {
    this.state(seat).connected = false;
    this.fitRoles();
  }

  /** Refused (false) when another player already has that build. */
  pick(seat: number, build: BuildId): boolean {
    if (this.taken(seat).includes(build)) return false;
    this.state(seat).pick = build;
    return true;
  }

  /** Ready puts a player on the smaller side if the host has not placed them yet. */
  setReady(seat: number, ready: boolean): void {
    const state = this.state(seat);
    state.ready = ready && state.pick !== null && state.connected;
    if (state.ready && state.team === null) state.team = this.smallerTeam(seat);
    this.fitRoles();
  }

  /** The host moves a player to a side, if there is room on it, or takes them off it. */
  setTeam(seat: number, team: TeamId | null): boolean {
    const state = this.seats.get(seat);
    if (!state) return false;
    if (team !== null && this.teamCount(team, seat) >= TEAM_SIZE) return false;
    state.team = team;
    // Joining a side with a QB already, they run; the fit below makes them QB if the side has none.
    state.role = "runner";
    this.fitRoles();
    return true;
  }

  /**
   * The host makes a player the QB, or a runner. The side's old QB
   * becomes a runner; a QB made a runner hands the job to the next
   * person on the side. A player alone on a side stays QB.
   */
  setRole(seat: number, role: LobbyRole): boolean {
    const state = this.seats.get(seat);
    if (!state || state.team === null || !state.connected || state.role === role) return false;
    const mates = this.side(state.team).filter((s) => s !== seat);
    if (role === "runner" && mates.length === 0) return false;
    if (role === "qb") for (const other of mates) this.seats.get(other)!.role = "runner";
    else this.seats.get(mates[0]!)!.role = "qb";
    state.role = role;
    this.fitRoles();
    return true;
  }

  /** Every side with people has exactly one QB among them; off a side there is no role. */
  private fitRoles(): void {
    for (const s of this.seats.values()) if (s.team === null) s.role = null;
    for (const team of [0, 1] as const) {
      const side = this.side(team).map((seat) => this.seats.get(seat)!);
      const qbs = side.filter((s) => s.role === "qb");
      for (const s of side) if (s.role === null) s.role = "runner";
      if (qbs.length > 1) for (const s of qbs.slice(1)) s.role = "runner";
      if (qbs.length === 0 && side[0]) side[0].role = "qb";
    }
  }

  /** Connected players on a side, in seat order. */
  side(team: TeamId): number[] {
    return [...this.seats.entries()]
      .filter(([, s]) => s.connected && s.team === team)
      .map(([seat]) => seat)
      .sort((a, b) => a - b);
  }

  /** Builds held by connected players other than `seat`. */
  taken(seat: number): BuildId[] {
    const out: BuildId[] = [];
    for (const [other, s] of this.seats) if (other !== seat && s.connected && s.pick) out.push(s.pick);
    return out;
  }

  /** Connected players on a side, not counting `except`. */
  teamCount(team: TeamId, except?: number): number {
    return this.side(team).filter((seat) => seat !== except).length;
  }

  private smallerTeam(seat: number): TeamId | null {
    const storm = this.teamCount(0, seat);
    const blaze = this.teamCount(1, seat);
    if (storm >= TEAM_SIZE && blaze >= TEAM_SIZE) return null;
    if (storm >= TEAM_SIZE) return 1;
    if (blaze >= TEAM_SIZE) return 0;
    return blaze < storm ? 1 : 0;
  }

  /** Connected, ready, with a build, and placed on a side: in the next match. */
  get players(): number[] {
    return [...this.seats.entries()]
      .filter(([, s]) => s.connected && s.ready && s.pick && s.team !== null)
      .map(([seat]) => seat)
      .sort((a, b) => a - b);
  }

  get connectedSeats(): number[] {
    return [...this.seats.entries()].filter(([, s]) => s.connected).map(([seat]) => seat).sort((a, b) => a - b);
  }

  /** Builds nobody picked, in order, for the computer players. */
  spareBuilds(): BuildId[] {
    const used = new Set([...this.seats.values()].filter((s) => s.connected && s.pick).map((s) => s.pick));
    return BUILD_IDS.filter((id) => !used.has(id));
  }

  setLevel(level: BotLevel): void {
    this.level = level;
  }

  /** Why a match cannot start yet, or null when it can: one ready person is enough. */
  startBlock(): "empty" | null {
    return this.players.length === 0 ? "empty" : null;
  }

  /**
   * The line up. On each side the ready person the host made QB plays
   * it (or the first ready person, if the QB is not ready yet), the other
   * ready people run, and computer players in the builds nobody picked
   * fill the rest: the QB of a side with nobody on it, and runners up to
   * two a side. A computer QB takes a QB build when one is free.
   */
  lineup(): Entry[] {
    // Builds nobody picked go first; if they run out, the builds of people not in this game are free too.
    const playing = new Set(this.players.map((seat) => this.seats.get(seat)!.pick));
    const free = this.spareBuilds();
    const spare = [...free, ...BUILD_IDS.filter((id) => !playing.has(id) && !free.includes(id))];
    const out: Entry[] = [];
    for (const team of [0, 1] as const) {
      const people = this.players.filter((seat) => this.seats.get(seat)!.team === team).slice(0, TEAM_SIZE);
      const qb = people.find((seat) => this.seats.get(seat)!.role === "qb") ?? people[0];
      out.push(qb !== undefined ? { team, role: "qb", build: this.seats.get(qb)!.pick!, seat: qb } : { team, role: "qb", build: takeSpare(spare, "qb"), seat: null });
      const runners = people.filter((seat) => seat !== qb);
      for (const seat of runners) out.push({ team, role: "runner", build: this.seats.get(seat)!.pick!, seat });
      for (let n = runners.length; n < MAX_RUNNERS; n++) out.push({ team, role: "runner", build: takeSpare(spare, "runner"), seat: null });
    }
    return out;
  }
}
