import type { Difficulty, TeamId } from "../engine/fighter";
import type { GunId } from "../engine/guns";
import type { Mode } from "../protocol";
import { splitPanes, type ViewRect } from "../render/layout";

/** Places per team in each mode. */
export const TEAM_SIZE: Record<Mode, number> = { "1v1": 1, "2v2": 2 };

export interface SeatState {
  connected: boolean;
  gun: GunId | null;
  ready: boolean;
  /** Null while both teams are full and the player waits on the bench. */
  team: TeamId | null;
  /** When they were put on their team, so a full team moves its newest arrival. */
  placedAt: number;
}

/** One place on a team: a player, or a computer filling in. */
export interface Spot {
  team: TeamId;
  seat: number | null;
}

/**
 * Who is in the room, the gun each player chose and which team the host
 * put them on. The host picks one against one or two against two, and
 * how good the computer players are. New players land on the smaller
 * team; with both full they wait on the bench. Computer players fill
 * every place left, so a player alone still gets a fight.
 */
export class Lobby {
  readonly seats = new Map<number, SeatState>();
  mode: Mode = "1v1";
  difficulty: Difficulty = "normal";
  private clock = 0;

  private state(seat: number): SeatState {
    let s = this.seats.get(seat);
    if (!s) {
      s = { connected: false, gun: null, ready: false, team: null, placedAt: 0 };
      this.seats.set(seat, s);
    }
    return s;
  }

  get size(): number {
    return TEAM_SIZE[this.mode];
  }

  connect(seat: number): void {
    const s = this.state(seat);
    s.connected = true;
    // Back from a dropped phone: keep the old place if it is still free.
    if (s.team !== null && this.members(s.team).length > this.size) s.team = null;
    if (s.team === null) this.placeNew(seat);
  }

  /** A player whose phone drops keeps their team and gun for when they come back. */
  disconnect(seat: number): void {
    this.state(seat).connected = false;
    this.fillFromBench();
  }

  setGun(seat: number, gun: GunId): void {
    this.state(seat).gun = gun;
  }

  setReady(seat: number, ready: boolean): void {
    const s = this.state(seat);
    s.ready = ready && s.gun !== null && s.connected;
  }

  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
  }

  /** One against one or two against two. Players who no longer fit wait on the bench. */
  setMode(mode: Mode): void {
    this.mode = mode;
    for (const team of [0, 1] as const) for (const seat of this.members(team).slice(this.size)) this.state(seat).team = null;
    this.fillFromBench();
  }

  /** Moves a player to a team. A full team sends its newest member the other way, or to the bench. */
  setTeam(seat: number, team: TeamId): void {
    const s = this.seats.get(seat);
    if (!s?.connected || s.team === team) return;
    const from = s.team;
    const there = this.members(team);
    if (there.length >= this.size) {
      const newest = [...there].sort((a, b) => this.state(b).placedAt - this.state(a).placedAt)[0]!;
      this.state(newest).team = null;
      if (from !== null) this.place(newest, from);
    }
    this.place(seat, team);
    this.fillFromBench();
  }

  /** Deals the placed players onto the teams at random, as evenly as possible. */
  shuffle(random: () => number = Math.random): void {
    const placed = this.connectedSeats.filter((seat) => this.state(seat).team !== null);
    placed.map((seat) => ({ seat, key: random() })).sort((a, b) => a.key - b.key).forEach(({ seat }, i) => this.place(seat, (i % 2) as TeamId));
  }

  get connectedSeats(): number[] {
    return [...this.seats.entries()].filter(([, s]) => s.connected).map(([seat]) => seat).sort((a, b) => a - b);
  }

  /** Connected players on a team, first placed first. */
  members(team: TeamId): number[] {
    return this.connectedSeats.filter((seat) => this.state(seat).team === team).sort((a, b) => this.state(a).placedAt - this.state(b).placedAt);
  }

  /** Connected players with no place, waiting for one. */
  get bench(): number[] {
    return this.connectedSeats.filter((seat) => this.state(seat).team === null);
  }

  /** Every place, team by team: the players placed there, then computer players. */
  spots(): Spot[] {
    const out: Spot[] = [];
    for (const team of [0, 1] as const) {
      const players = this.members(team).slice(0, this.size);
      for (const seat of players) out.push({ team, seat });
      for (let i = players.length; i < this.size; i++) out.push({ team, seat: null });
    }
    return out;
  }

  isReady(seat: number): boolean {
    const s = this.seats.get(seat);
    return !!s && s.connected && s.ready && s.gun !== null;
  }

  /** A match needs one player ready. Players still choosing sit it out. */
  canStart(): boolean {
    return this.spots().some((spot) => spot.seat !== null && this.isReady(spot.seat));
  }

  /** The places the match is built from: ready players keep theirs, the rest go to computer players. */
  entries(): { team: TeamId; seat: number | null; gun: GunId | null }[] {
    return this.spots().map((spot) => {
      const seat = spot.seat !== null && this.isReady(spot.seat) ? spot.seat : null;
      return { team: spot.team, seat, gun: seat === null ? null : this.state(seat).gun };
    });
  }

  /**
   * The split screen as it stands, so players can calibrate in their own
   * view before the match: every placed player has one, ready or not.
   */
  views(): Map<number, ViewRect> {
    const spots = this.spots();
    const humans = spots.flatMap((spot, id) => (spot.seat === null ? [] : [{ id, team: spot.team }]));
    const out = new Map<number, ViewRect>();
    for (const pane of splitPanes(humans)) {
      const seat = pane.fighter === null ? null : spots[pane.fighter]?.seat;
      if (seat !== null && seat !== undefined) out.set(seat, pane.rect);
    }
    return out;
  }

  private placeNew(seat: number): void {
    const counts = ([0, 1] as const).map((team) => this.members(team).filter((s) => s !== seat).length);
    const team: TeamId = counts[0]! <= counts[1]! ? 0 : 1;
    if (counts[team]! < this.size) this.place(seat, team);
    else this.state(seat).team = null;
  }

  /** Bench players take any place that opened up, in seat order. */
  private fillFromBench(): void {
    for (const seat of this.bench) this.placeNew(seat);
  }

  private place(seat: number, team: TeamId): void {
    const s = this.state(seat);
    s.team = team;
    s.placedAt = ++this.clock;
  }
}
