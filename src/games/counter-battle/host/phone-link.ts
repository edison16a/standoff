import type { HostRoomApi } from "@/platform/games/game-api";
import type { BuzzKind, PhoneState } from "../protocol";

/** Routine updates (the reload running down) go out at most this often per phone. */
const MIN_GAP_MS = 120;

/**
 * The host's line to the phones. Each phone gets its own full state,
 * sent only when it changed. Anything a player waits on (the phase, their
 * view, a shot fired, a hit taken) goes at once; the steady churn of the
 * reload timer is held to a few updates a second.
 */
export class PhoneLink {
  private readonly last = new Map<number, { json: string; at: number; urgent: string }>();

  constructor(private readonly room: HostRoomApi) {}

  sendState(seat: number, state: PhoneState, nowMs: number): void {
    const json = JSON.stringify(state);
    const z = state.zone;
    const urgent = `${state.phase}|${state.team}|${state.gun}|${state.ready}|${state.playing}|${z?.x},${z?.y},${z?.w}|${state.ammo}|${state.reloading}|${state.health}|${state.alive}|${state.armed}|${state.score.join()}|${state.banner}`;
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
