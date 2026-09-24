import type { HostRoomApi } from "@/platform/games/game-api";
import type { Seat } from "@/platform/protocol";
import { CENTER, type Stick } from "./stick-math";
import { padPressSchema, padStateSchema } from "./protocol";

interface SeatPad {
  stick: Stick;
  held: Set<string>;
  seenAt: number;
}

/** A phone silent this long has its stick centred, so a dropped phone never keeps running. */
const STALE_MS = 1000;

export type PressListener = (seat: Seat, button: string, down: boolean, stick: Stick) => void;

/**
 * The host side of the gamepad kit. It keeps each seat's stick and held
 * buttons, and tells the game about every press and release exactly once.
 */
export class HostPad {
  private readonly seats = new Map<Seat, SeatPad>();
  private readonly listeners = new Set<PressListener>();
  private readonly off: () => void;

  constructor(room: HostRoomApi) {
    this.off = room.on((event) => {
      if (event.type === "left") return this.clear(event.seat);
      if (event.type !== "message") return;
      const state = padStateSchema.safeParse(event.payload);
      if (state.success) {
        const pad = this.entry(event.seat);
        pad.stick = { x: state.data.x, y: state.data.y };
        pad.seenAt = performance.now();
        return;
      }
      const press = padPressSchema.safeParse(event.payload);
      if (!press.success) return;
      const { button, down, x, y } = press.data;
      const pad = this.entry(event.seat);
      pad.stick = { x, y };
      pad.seenAt = performance.now();
      // A repeat of the same state is a resend after a reconnect, not a new press.
      if (pad.held.has(button) === down) return;
      if (down) pad.held.add(button);
      else pad.held.delete(button);
      for (const listener of this.listeners) listener(event.seat, button, down, pad.stick);
    });
  }

  /** The seat's stick, centred if the phone has gone quiet. */
  stick(seat: Seat, nowMs = performance.now()): Stick {
    const pad = this.seats.get(seat);
    if (!pad || nowMs - pad.seenAt > STALE_MS) return CENTER;
    return pad.stick;
  }

  isHeld(seat: Seat, button: string): boolean {
    return this.seats.get(seat)?.held.has(button) ?? false;
  }

  /** Every press and release. Returns an unsubscribe. */
  onPress(listener: PressListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Forgets a seat, releasing anything it held, for a phone that leaves. */
  clear(seat: Seat): void {
    const pad = this.seats.get(seat);
    if (!pad) return;
    for (const button of [...pad.held]) {
      pad.held.delete(button);
      for (const listener of this.listeners) listener(seat, button, false, CENTER);
    }
    this.seats.delete(seat);
  }

  dispose(): void {
    this.off();
    this.listeners.clear();
  }

  private entry(seat: Seat): SeatPad {
    let pad = this.seats.get(seat);
    if (!pad) {
      pad = { stick: CENTER, held: new Set(), seenAt: performance.now() };
      this.seats.set(seat, pad);
    }
    return pad;
  }
}
