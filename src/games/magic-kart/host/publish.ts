import type { Player } from "@/platform/games/game-api";
import type { Phase } from "../protocol";
import type { Banners } from "./banners";
import { useKartStore as store } from "./host-store";
import type { Lobby } from "./lobby";
import type { PhoneLink } from "./phone-link";
import type { RaceDriver } from "./race-driver";
import { buildPhoneState, buildStandings, buildView } from "./snapshots";

export interface PublishContext {
  nowMs: number;
  phase: Phase;
  players: readonly Player[];
  names: ReadonlyMap<number, string>;
  lobby: Lobby;
  driver: RaceDriver | null;
  banners: Banners;
  phones: PhoneLink;
}

/** 3, 2, 1, then 0 for a moment at the start signal. */
export function countdownOf(time: number): number | null {
  if (time < -3) return null;
  if (time < 0) return Math.ceil(-time);
  return time < 1 ? 0 : null;
}

/**
 * Writes the current state out to everyone who shows it: the overlay on
 * the big screen through the store, and each phone its own screen state.
 */
export function publish(c: PublishContext): void {
  const world = c.driver?.world ?? null;
  const countdown = world ? countdownOf(world.time) : null;
  const seats = c.players.map((p) => {
    const s = c.lobby.seats.get(p.seat);
    return { seat: p.seat, name: p.name, connected: p.connected, pick: s?.pick ?? null, ready: s?.ready ?? false };
  });
  const humans = world ? world.karts.filter((k) => k.seat !== null) : [];
  store.setState({
    phase: c.phase,
    seats,
    countdown,
    standings: world ? buildStandings(world, c.names) : [],
    views: world ? humans.map((k) => buildView(world, k, c.names, c.banners.text(k.id, world.time))) : [],
  });
  const map = store.getState().mapId;
  for (const seat of c.lobby.connectedSeats) {
    const kartId = c.driver?.kartBySeat.get(seat);
    const state = c.lobby.seats.get(seat)!;
    const kart = world && kartId !== undefined ? (world.karts[kartId] ?? null) : null;
    c.phones.sendState(
      seat,
      buildPhoneState({ phase: c.phase, map, taken: c.lobby.taken(seat), pick: state.pick, ready: state.ready, world, kart, countdown }),
      c.nowMs,
    );
  }
}
