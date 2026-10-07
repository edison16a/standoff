import type { Player } from "@/platform/games/game-api";
import type { RoomPhase } from "../protocol";
import { scoreboard } from "../render/hud/board";
import { useFootballStore as store, type Callout } from "./host-store";
import type { Lobby } from "./lobby";
import type { MatchDriver } from "./match-driver";
import type { PhoneLink } from "./phone-link";
import { phoneState } from "./phone-state";
import type { ReplayDirector } from "./replay/director";
import { resultRows } from "./results";
import { ceremonyCard, type CeremonyCard } from "./ceremony-card";
import type { Match } from "../engine/match";

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
  /** The host asked for the stats before the presentation brought them in. */
  statsEarly: boolean;
}

/** The presentation's card, moved straight to the stats when the host asked for them early. */
function presentation(m: Match, names: ReadonlyMap<number, string>, early: boolean): CeremonyCard | null {
  const card = ceremonyCard(m, names);
  return card && early ? { ...card, stage: "stats" } : card;
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
  store.setState({
    phase: c.phase,
    seats,
    bots: c.lobby.lineup().filter((e) => e.seat === null).map((e) => ({ team: e.team, build: e.build, role: e.role })),
    level: c.lobby.level,
    startBlock: c.lobby.startBlock(),
    // The live score, never the replay's: the replay shows a moment already on the board.
    board: c.driver ? scoreboard(c.driver.view) : null,
    callout: c.callout,
    replayCard: c.replay.card(c.nameOf),
    score: m ? [m.score[0], m.score[1]] : [0, 0],
    over: m && m.phase === "over" ? { winner: m.winner } : null,
    results: m && m.phase === "over" ? resultRows(m, names) : [],
    ceremony: m ? presentation(m, names, c.statsEarly) : null,
  });
  const votes = c.replay.active ? c.replay.votes : null;
  for (const seat of c.lobby.connectedSeats) {
    const state = phoneState({ phase: c.phase, name: names.get(seat) ?? "", seat: c.lobby.seats.get(seat)!, taken: c.lobby.taken(seat), match: m, callout: c.callout, votes }, seat);
    c.phones.sendState(seat, state, c.nowMs);
  }
}
