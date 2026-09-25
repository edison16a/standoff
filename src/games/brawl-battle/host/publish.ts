import { playerColor } from "@/games/kit/players";
import type { Player } from "@/platform/games/game-api";
import type { MatchState } from "../engine/types";
import type { PhoneState, RoomPhase } from "../protocol";
import { fighterColours } from "../render/colors";
import { CHARACTERS } from "../roster";
import { useBrawlStore as store, type FighterCard } from "./host-store";
import type { Lobby } from "./lobby";
import type { MatchDriver } from "./match-driver";
import type { PhoneLink } from "./phone-link";

export interface PublishContext {
  nowMs: number;
  players: readonly Player[];
  lobby: Lobby;
  driver: MatchDriver | null;
  phones: PhoneLink;
  /** Hits taken per fighter, so the HUD can bump a percent on each. */
  hits: readonly number[];
}

export function roomPhaseOf(driver: MatchDriver | null): RoomPhase {
  const phase = driver?.state.phase;
  if (!phase) return "lobby";
  return phase === "ready" ? "countdown" : phase === "over" ? "results" : phase;
}

/** The name a fighter goes by: the player's own, or the fighter's for a computer. */
export function nameFor(m: MatchState, id: number, players: readonly Player[]): string {
  const f = m.fighters[id];
  if (!f) return "";
  const person = f.seat !== null ? players.find((p) => p.seat === f.seat) : undefined;
  return person?.name || `CPU ${CHARACTERS[f.character].name}`;
}

function cards(m: MatchState, c: PublishContext): FighterCard[] {
  const colours = fighterColours(m.fighters);
  return m.fighters.map((f) => ({
    id: f.id,
    name: nameFor(m, f.id, c.players),
    character: f.character,
    colour: colours[f.id]!.colour,
    bot: f.seat === null,
    away: f.seat !== null && f.brain !== null,
    percent: Math.round(f.percent),
    stocks: f.stocks,
    ult: f.ult,
    out: f.stocks === 0,
    place: f.place,
    kos: f.stats.kos,
    falls: f.stats.falls,
    damage: Math.round(f.stats.damageDealt),
    hits: c.hits[f.id] ?? 0,
  }));
}

function callOf(m: MatchState | null): "ready" | "fight" | "game" | null {
  if (!m) return null;
  if (m.phase === "ready") return "ready";
  if (m.phase === "fight" && m.phaseFrame < 45) return "fight";
  return m.phase === "game" ? "game" : null;
}

/** Writes the current state to the big screen's store and to every phone. */
export function publish(c: PublishContext): void {
  const m = c.driver?.state ?? null;
  const phase = roomPhaseOf(c.driver);
  const seats = c.players.map((p) => {
    const s = c.lobby.seats.get(p.seat);
    return { seat: p.seat, name: p.name, connected: p.connected, pick: s?.pick ?? null, ready: s?.ready ?? false };
  });
  const nameOfSeat = (seat: number) => c.players.find((p) => p.seat === seat)?.name || `Player ${seat}`;
  const slots = c.lobby.slots().map((slot) => {
    if (slot.kind === "player") return { ...slot, name: nameOfSeat(slot.seat), colour: playerColor(slot.seat) };
    if (slot.kind === "bot") return { ...slot, name: `CPU ${CHARACTERS[slot.character].name}`, colour: null };
    return { ...slot, name: "", colour: null };
  });
  const inMatch = c.driver?.fighterBySeat ?? new Map<number, number>();
  const call = callOf(m);
  store.setState({
    phase,
    seats,
    slots,
    bots: c.lobby.bots,
    difficulty: c.lobby.difficulty,
    canStart: c.lobby.canStart(),
    stageName: m?.stage.name ?? "",
    fighters: m ? cards(m, c) : [],
    call,
    winner: m?.winner ?? null,
    waiting: c.driver ? seats.filter((s) => s.connected && !inMatch.has(s.seat)).map((s) => s.name) : [],
  });
  for (const seat of c.lobby.connectedSeats) {
    const s = c.lobby.seats.get(seat)!;
    const id = inMatch.get(seat);
    const f = m && id !== undefined ? m.fighters[id] : undefined;
    const state: PhoneState = {
      kind: "state",
      phase,
      pick: s.pick,
      ready: s.ready,
      playing: !!f,
      percent: f ? Math.min(999, Math.round(f.percent)) : 0,
      stocks: f?.stocks ?? 0,
      ult: f ? Math.max(0, Math.min(1, f.ult)) : 0,
      out: !!f && f.stocks === 0,
      kos: Math.min(99, f?.stats.kos ?? 0),
      place: f?.place ?? null,
      banner: f && call ? { ready: "Ready", fight: "Fight", game: "Game" }[call] : null,
    };
    c.phones.sendState(seat, state, c.nowMs);
  }
}
