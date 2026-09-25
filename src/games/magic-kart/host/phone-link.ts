import type { HostRoomApi } from "@/platform/games/game-api";
import type { BuzzKind, PhoneState } from "../protocol";

/** Routine updates (place, lap) go out at most this often per phone. */
const MIN_GAP_MS = 90;

/**
 * The host's line to the phones. Each phone gets its own screen state,
 * sent only when it changed. A change to the phase or the held item goes
 * out at once, since the player is waiting on it. So does a drift
 * starting, ending or changing colour. The steady churn of places and
 * speed during a race is held to a few updates a second.
 */
export class PhoneLink {
  private readonly last = new Map<number, { json: string; at: number; urgent: string }>();

  constructor(private readonly room: HostRoomApi) {}

  sendState(seat: number, state: PhoneState, nowMs: number): void {
    const json = JSON.stringify(state);
    const urgent = `${state.phase}|${state.item}|${state.rolling}|${state.countdown}|${state.finished}|${state.pick}|${state.ready}|${state.drift}`;
    const prev = this.last.get(seat);
    if (prev?.json === json) return;
    if (prev && prev.urgent === urgent && nowMs - prev.at < MIN_GAP_MS) return;
    this.last.set(seat, { json, at: nowMs, urgent });
    this.room.send(seat, state);
  }

  buzz(seat: number, event: BuzzKind): void {
    this.room.send(seat, { kind: "buzz", event });
  }

  /** Makes the next state go out even if unchanged, for a phone that just joined. */
  forget(seat?: number): void {
    if (seat === undefined) this.last.clear();
    else this.last.delete(seat);
  }
}
