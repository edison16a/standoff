import type { HostRoomApi } from "@/platform/games/game-api";
import type { BuzzKind, PhoneState } from "../protocol";

/** Routine updates (the shot clock ticking) go out at most this often per phone. */
const MIN_GAP_MS = 120;

/**
 * The host's line to the phones. Each phone gets its own full screen
 * state, sent only when it changed; anything a player waits on (the
 * ball, the phase, a steal) goes at once, while the steady churn of the
 * clock is held to a few updates a second.
 */
export class PhoneLink {
  private readonly last = new Map<number, { json: string; at: number; urgent: string }>();

  constructor(private readonly room: HostRoomApi) {}

  sendState(seat: number, state: PhoneState, nowMs: number): void {
    const json = JSON.stringify(state);
    const c = state.court;
    const urgent = `${state.phase}|${state.pick}|${state.ready}|${state.team}|${state.playing}|${c?.hasBall}|${c?.attacking}|${c?.mustClear}|${c?.canSteal}|${c?.countdown}|${c?.score.join()}|${c?.onFire}`;
    const prev = this.last.get(seat);
    if (prev?.json === json) return;
    if (prev && prev.urgent === urgent && nowMs - prev.at < MIN_GAP_MS) return;
    this.last.set(seat, { json, at: nowMs, urgent });
    this.room.send(seat, state);
  }

  buzz(seat: number, event: BuzzKind, text: string | null = null): void {
    this.room.send(seat, { kind: "buzz", event, text });
  }

  /** Makes the next state go out even if unchanged, for a phone that just joined or reconnected. */
  forget(seat?: number): void {
    if (seat === undefined) this.last.clear();
    else this.last.delete(seat);
  }
}
