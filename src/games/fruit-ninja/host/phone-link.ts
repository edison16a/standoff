import type { HostRoomApi } from "@/platform/games/game-api";
import type { Seat } from "../engine/events";
import type { Match } from "../engine/match";
import type { BuzzEvent, HostMessage, PhoneState } from "../protocol";
import type { RoundHud } from "./host-store";

/** Place in the round from 1, with ties sharing a place. */
export function rankOf(seat: Seat, hud: RoundHud): number | null {
  const mine = hud.standings.find((row) => row.seat === seat);
  if (!mine) return null;
  return 1 + hud.standings.filter((row) => row.score > mine.score).length;
}

/** The screen state for one phone, built fresh from the round. */
export function phoneState(seat: Seat, hud: RoundHud, match: Match | null): PhoneState {
  const inRound = hud.phase !== "lobby" && !!match?.has(seat);
  const over = hud.phase === "over";
  return {
    kind: "state",
    phase: hud.phase,
    inRound,
    score: inRound ? (match?.scores.get(seat) ?? 0) : 0,
    rank: inRound ? rankOf(seat, hud) : null,
    players: hud.standings.length,
    secondsLeft: Math.ceil(hud.secondsLeft),
    countdown: hud.countdown,
    stunned: inRound && (match?.stunLeft(seat) ?? 0) > 0,
    standings: over ? hud.standings.map(({ seat: s, name, score }) => ({ seat: s, name, score })) : [],
    winners: over ? hud.winners : [],
  };
}

/**
 * The host's line to the phones. Each phone's state is rebuilt every
 * frame but only goes out when it changed, which is about once a second
 * for the clock plus whenever that player scores.
 */
export class PhoneLink {
  private readonly last = new Map<Seat, string>();

  constructor(private readonly room: HostRoomApi) {}

  sendState(seat: Seat, state: PhoneState): void {
    const serialized = JSON.stringify(state);
    if (this.last.get(seat) === serialized) return;
    this.last.set(seat, serialized);
    this.send(seat, state);
  }

  buzz(seat: Seat, event: BuzzEvent): void {
    this.send(seat, { kind: "buzz", event });
  }

  /** Makes the next state go out even if unchanged, for a phone that just joined or a resync. */
  forget(seat?: Seat): void {
    if (seat === undefined) this.last.clear();
    else this.last.delete(seat);
  }

  private send(seat: Seat, payload: HostMessage): void {
    this.room.send(seat, payload);
  }
}
