import type { Player } from "@/platform/games/game-api";
import { ROSTER } from "../roster";
import type { RoomPhase } from "../protocol";
import { TEAMS } from "../teams";
import { useFifaStore as store, type ResultRow } from "./host-store";
import type { Lobby } from "./lobby";
import type { MatchDriver } from "./match-driver";
import type { PhoneLink } from "./phone-link";
import { momentOf } from "./moment";
import { phoneState } from "./phone-state";
import type { ReplayDirector } from "./replay-director";

export interface PublishContext {
  nowMs: number;
  phase: RoomPhase;
  players: readonly Player[];
  lobby: Lobby;
  driver: MatchDriver | null;
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
  const match = c.driver?.state ?? null;
  const owner = match?.ball.owner;
  const seats = c.players.map((p) => {
    const s = c.lobby.seats.get(p.seat);
    return { seat: p.seat, name: p.name, connected: p.connected, pick: s?.pick ?? null, ready: s?.ready ?? false, team: s?.team ?? null, role: s?.role ?? null };
  });
  const lineup = c.lobby.lineup();
  store.setState({
    phase: c.phase,
    seats,
    bots: lineup.filter((e) => e.seat === null).map((e) => ({ team: e.team, character: e.character, role: e.role })),
    botsOn: c.lobby.bots,
    level: c.lobby.level,
    moment: match ? momentOf(match, (id) => c.nameOf(id)) : null,
    startBlock: c.lobby.startBlock(),
    score: match ? [match.score[0], match.score[1]] : [0, 0],
    clock: match ? Math.ceil(match.clock) : 0,
    golden: match?.golden ?? false,
    replay: c.replay.active,
    replayCard: c.driver ? c.replay.card(c.driver, (id) => c.nameOf(id)) : null,
    skip: c.replay.skipList((seat) => names.get(seat) ?? `Player ${seat + 1}`),
    winner: match?.winner ?? null,
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

/** Every player's line at full time, best first, then each side's keeper with their saves. */
function results(driver: MatchDriver, names: ReadonlyMap<number, string>): ResultRow[] {
  const players: ResultRow[] = driver.state.athletes
    .map((a) => ({
      id: a.id,
      team: a.team,
      name: a.seat !== null ? (names.get(a.seat) ?? ROSTER[a.character].short) : ROSTER[a.character].name,
      character: a.character,
      seat: a.seat,
      goals: a.stats.goals,
      shots: a.stats.shots,
      tackles: a.stats.tackles,
      passes: a.stats.passes,
      saves: a.stats.blocks,
    }))
    .sort((x, y) => y.goals - x.goals || y.tackles - x.tackles || x.id - y.id);
  const keepers: ResultRow[] = driver.state.keepers.map((k) => ({
    id: -1 - k.team,
    team: k.team,
    name: `${TEAMS[k.team].name} keeper`,
    character: null,
    seat: null,
    goals: 0,
    shots: 0,
    tackles: 0,
    passes: 0,
    saves: k.saves,
  }));
  return [...players, ...keepers];
}
