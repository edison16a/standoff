import type { Difficulty } from "../engine/bots/brain";
import type { Entrant } from "../engine/match";
import { CHARACTER_IDS, type CharacterId } from "../roster";

export const MAX_FIGHTERS = 4;

export interface SeatState {
  connected: boolean;
  pick: CharacterId | null;
  ready: boolean;
}

/** One of the four places in the lobby: a player, a computer, or nobody yet. */
export type Slot =
  | { kind: "player"; seat: number; character: CharacterId }
  | { kind: "bot"; character: CharacterId }
  | { kind: "open" };

/**
 * Who is in the room, which fighter each picked, and how many computer
 * fighters the host wants and how good they are. Two players may pick
 * the same fighter. A player alone always gets at least one computer
 * fighter, so there is someone to fight.
 */
export class Lobby {
  readonly seats = new Map<number, SeatState>();
  bots = 1;
  difficulty: Difficulty = "normal";

  private state(seat: number): SeatState {
    let s = this.seats.get(seat);
    if (!s) {
      s = { connected: false, pick: null, ready: false };
      this.seats.set(seat, s);
    }
    return s;
  }

  connect(seat: number): void {
    this.state(seat).connected = true;
  }

  /** A player whose phone drops keeps their pick for when they come back. */
  disconnect(seat: number): void {
    this.state(seat).connected = false;
  }

  pick(seat: number, character: CharacterId): void {
    this.state(seat).pick = character;
  }

  setReady(seat: number, ready: boolean): void {
    const s = this.state(seat);
    s.ready = ready && s.pick !== null && s.connected;
  }

  setBots(count: number): void {
    this.bots = Math.max(0, Math.min(MAX_FIGHTERS - 1, Math.round(count)));
  }

  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
  }

  get connectedSeats(): number[] {
    return [...this.seats.entries()].filter(([, s]) => s.connected).map(([seat]) => seat).sort((a, b) => a - b);
  }

  /** Players who picked and said ready, in seat order, at most four. */
  get readySeats(): number[] {
    return this.connectedSeats.filter((seat) => this.state(seat).ready && this.state(seat).pick !== null).slice(0, MAX_FIGHTERS);
  }

  /** How many computers join: what the host asked for, as room allows, and one for a player alone. */
  botsJoining(): number {
    const players = this.readySeats.length;
    const room = MAX_FIGHTERS - players;
    return Math.min(room, Math.max(this.bots, players === 1 ? 1 : 0));
  }

  /** The four places: ready players first, then computers, then open places. */
  slots(): Slot[] {
    const out: Slot[] = this.readySeats.map((seat) => ({ kind: "player", seat, character: this.state(seat).pick! }));
    for (const character of this.botCharacters()) out.push({ kind: "bot", character });
    while (out.length < MAX_FIGHTERS) out.push({ kind: "open" });
    return out;
  }

  /** Whether a match can start: someone ready, and at least two fighters. */
  canStart(): boolean {
    return this.readySeats.length > 0 && this.readySeats.length + this.botsJoining() >= 2;
  }

  entrants(): Entrant[] {
    return this.slots().flatMap((slot): Entrant[] => {
      if (slot.kind === "player") return [{ character: slot.character, seat: slot.seat }];
      if (slot.kind === "bot") return [{ character: slot.character, seat: null }];
      return [];
    });
  }

  /** Computers take the fighters nobody picked first, so the stage is as varied as it can be. */
  private botCharacters(): CharacterId[] {
    const used = new Set(this.readySeats.map((seat) => this.state(seat).pick!));
    const order = [...CHARACTER_IDS.filter((id) => !used.has(id)), ...CHARACTER_IDS.filter((id) => used.has(id))];
    return Array.from({ length: this.botsJoining() }, (_, i) => order[i % order.length]!);
  }
}
