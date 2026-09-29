import type { Player } from "@/platform/games/game-api";
import type { RoomPhase } from "../protocol";
import { scoreboard } from "../render/hud/board";
import { CHARACTERS } from "../roster";
import { useFootballStore as store, type Callout } from "./host-store";
import type { Lobby } from "./lobby";
import type { MatchDriver } from "./match-driver";
import type { PhoneLink } from "./phone-link";
import { phoneState } from "./phone-state";
import type { ReplayDirector } from "./replay/director";
import { resultRows } from "./results";

export interface PublishContext {
  nowMs: number;
  phase: RoomPhase;
  players: readonly Player[];
  lobby: Lobby;
  driver: MatchDriver | null;
  callout: Callout | null;
  phones: PhoneLink;
  replay: ReplayDirector;
  /** How a player is called on screen. */
  nameOf(id: number): string;
}

/**
 * Writes the current state out to everyone who shows it: the overlay on
 * the big screen through the store, and each phone its own screen state.
 */
export function publish(c: PublishContext): void {
  const names = new Map(c.players.map((p) => [p.seat, p.name]));
  const m = c.driver?.match ?? null;
  const seats = c.players.map((p) => {
    const s = c.lobby.seats.get(p.seat);
    return { seat: p.seat, name: p.name, connected: p.connected, pick: s?.pick ?? null, ready: s?.ready ?? false, team: s?.team ?? null, role: s?.role ?? null };
  });
  const holder = m?.carrier()?.id ?? null;
  store.setState({
    phase: c.phase,
    seats,
    bots: c.lobby.lineup().filter((e) => e.seat === null).map((e) => ({ team: e.team, character: e.character, role: e.role })),
    level: c.lobby.level,
    startBlock: c.lobby.startBlock(),
    // The live score, never the replay's: the replay shows a moment already on the board.
    board: c.driver ? scoreboard(c.driver.view) : null,
    callout: c.callout,
    replayCard: c.replay.card(c.nameOf),
    skip: c.replay.active ? c.replay.votes.list().map((v) => ({ ...v, name: names.get(v.seat) ?? `Player ${v.seat}` })) : [],
    score: m ? [m.score[0], m.score[1]] : [0, 0],
    over: m && m.phase === "over" ? { winner: m.winner } : null,
    results: m && m.phase === "over" ? resultRows(m, names) : [],
    strip: m
      ? m.athletes.filter((a) => a.seat !== null && a.character).map((a) => ({
          id: a.id,
          seat: a.seat!,
          name: names.get(a.seat!) ?? CHARACTERS[a.character!].short,
          team: a.team,
          character: a.character!,
          role: a.role === "qb" ? ("qb" as const) : ("runner" as const),
          hasBall: holder === a.id,
          away: a.auto,
        }))
      : [],
  });
  const votes = c.replay.active ? c.replay.votes : null;
  for (const seat of c.lobby.connectedSeats) {
    const state = phoneState({ phase: c.phase, seat: c.lobby.seats.get(seat)!, taken: c.lobby.taken(seat), match: m, callout: c.callout, votes }, seat);
    c.phones.sendState(seat, state, c.nowMs);
  }
}
