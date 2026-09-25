import type { Player } from "@/platform/games/game-api";
import { ROSTER } from "../roster";
import type { PhoneState, RoomPhase } from "../protocol";
import type { Banners } from "./banners";
import { useFifaStore as store, type ResultRow } from "./host-store";
import type { Lobby } from "./lobby";
import type { MatchDriver } from "./match-driver";
import type { PhoneLink } from "./phone-link";

export interface PublishContext {
  nowMs: number;
  phase: RoomPhase;
  players: readonly Player[];
  lobby: Lobby;
  driver: MatchDriver | null;
  banners: Banners;
  phones: PhoneLink;
  replay: boolean;
}

/**
 * Writes the current state out to everyone who shows it: the overlay on
 * the big screen through the store, and each phone its own screen state.
 */
export function publish(c: PublishContext): void {
  const names = new Map(c.players.map((p) => [p.seat, p.name]));
  const match = c.driver?.state ?? null;
  const owner = match?.ball.owner;
  const seats = c.players.map((p) => {
    const s = c.lobby.seats.get(p.seat);
    return { seat: p.seat, name: p.name, connected: p.connected, pick: s?.pick ?? null, ready: s?.ready ?? false, team: s?.team ?? null };
  });
  const lineup = c.lobby.entrants();
  store.setState({
    phase: c.phase,
    seats,
    bots: lineup.filter((e) => e.seat === null).map((e) => ({ team: e.team, character: e.character })),
    score: match ? [match.score[0], match.score[1]] : [0, 0],
    clock: match ? Math.ceil(match.clock) : 0,
    golden: match?.golden ?? false,
    replay: c.replay,
    banner: c.banners.current,
    winner: match?.winner ?? null,
    saves: match ? [match.keepers[0].saves, match.keepers[1].saves] : [0, 0],
    results: match && match.phase === "fulltime" ? results(c.driver!, names) : [],
    roster: match
      ? match.athletes.filter((a) => a.seat !== null).map((a) => ({
          id: a.id,
          seat: a.seat!,
          name: names.get(a.seat!) ?? ROSTER[a.character].short,
          team: a.team,
          character: a.character,
          hasBall: owner?.kind === "athlete" && owner.id === a.id,
          away: !a.online,
        }))
      : [],
  });
  for (const seat of c.lobby.connectedSeats) c.phones.sendState(seat, phoneState(c, seat), c.nowMs);
}

function results(driver: MatchDriver, names: ReadonlyMap<number, string>): ResultRow[] {
  return driver.state.athletes
    .map((a) => ({
      id: a.id,
      team: a.team,
      name: a.seat !== null ? (names.get(a.seat) ?? ROSTER[a.character].short) : ROSTER[a.character].name,
      character: a.character,
      seat: a.seat,
      ...a.stats,
    }))
    .sort((x, y) => y.goals - x.goals || y.tackles - x.tackles || x.id - y.id);
}

function phoneState(c: PublishContext, seat: number): PhoneState {
  const s = c.lobby.seats.get(seat)!;
  const match = c.driver?.state ?? null;
  const id = c.driver?.athleteBySeat.get(seat);
  const athlete = match && id !== undefined ? match.athletes[id] : undefined;
  const owner = match?.ball.owner;
  const team = athlete?.team ?? s.team;
  const over = match?.phase === "fulltime" && athlete;
  return {
    kind: "state",
    phase: c.phase,
    taken: c.lobby.taken(seat),
    pick: s.pick,
    ready: s.ready,
    team,
    playing: athlete !== undefined,
    score: match ? [match.score[0], match.score[1]] : [0, 0],
    clock: match ? Math.ceil(match.clock) : 0,
    golden: match?.golden ?? false,
    hasBall: !!athlete && owner?.kind === "athlete" && owner.id === athlete.id,
    goals: athlete?.stats.goals ?? 0,
    result: over ? (match.winner === athlete.team ? "win" : "lose") : null,
    banner: c.banners.current?.text ?? null,
  };
}
