import type { HostRoomApi } from "@/platform/games/game-api";
import type { BuzzKind, PhoneState } from "../protocol";

/** Routine updates (the clock, a countdown) go out at most this often per phone. */
const MIN_GAP_MS = 120;

/** The parts of a phone's state a player is waiting on: these go at once. */
function urgentKey(s: PhoneState): string {
  return [s.phase, s.pick, s.ready, s.team, s.role, s.pad, s.withBall, s.canThrow, s.meter?.stage, s.choose?.options.join(), s.score.join(), s.result, s.banner, s.grounded, s.skip?.agreed, s.skip?.count, s.taken.join()].join("|");
}

/**
 * The host's line to the phones. Each phone gets its own screen state,
 * sent only when it changed. Changes a player is waiting on (the phase,
 * their controls, the ball arriving in their hands, the score) go at
 * once; the ticking clocks are held to a few updates a second.
 */
export class PhoneLink {
  private readonly last = new Map<number, { json: string; at: number; urgent: string }>();

  constructor(private readonly room: HostRoomApi) {}

  sendState(seat: number, state: PhoneState, nowMs: number): void {
    const json = JSON.stringify(state);
    const urgent = urgentKey(state);
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
