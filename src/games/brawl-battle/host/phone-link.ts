import type { HostRoomApi } from "@/platform/games/game-api";
import type { BuzzKind, PhoneState } from "../protocol";

/** Routine updates (the percent and the ult ticking up) go out at most this often per phone. */
const MIN_GAP_MS = 120;

/**
 * The host's line to the phones. Each phone gets its own full state,
 * sent only when it changed. Anything a player waits on (the phase, a
 * lost life, a full ult) goes at once; the steady churn of the meter is
 * held to a few updates a second.
 */
export class PhoneLink {
  private readonly last = new Map<number, { json: string; at: number; urgent: string }>();

  constructor(private readonly room: HostRoomApi) {}

  sendState(seat: number, state: PhoneState, nowMs: number): void {
    const json = JSON.stringify(state);
    const urgent = `${state.phase}|${state.pick}|${state.ready}|${state.playing}|${state.stocks}|${state.out}|${state.place}|${state.banner}|${state.ult >= 1}`;
    const prev = this.last.get(seat);
    if (prev?.json === json) return;
    if (prev && prev.urgent === urgent && nowMs - prev.at < MIN_GAP_MS) return;
    this.last.set(seat, { json, at: nowMs, urgent });
    this.room.send(seat, state);
  }

  buzz(seat: number, event: BuzzKind): void {
    this.room.send(seat, { kind: "buzz", event });
  }

  /** Makes the next state go out even if unchanged, for a phone that just joined or reconnected. */
  forget(seat?: number): void {
    if (seat === undefined) this.last.clear();
    else this.last.delete(seat);
  }
}
