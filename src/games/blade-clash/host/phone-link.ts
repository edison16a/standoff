import type { Slot } from "@/games/blade-clash/players";
import type { ControllerState, HostMessage } from "@/games/blade-clash/protocol";
import type { HostRoomApi } from "@/platform/games/game-api";

/**
 * The host's line to the phones. The screen state goes out only when it
 * changed, since it is rebuilt every frame during a match and most frames
 * change nothing a phone shows.
 */
export class PhoneLink {
  private lastState = "";

  constructor(private readonly room: HostRoomApi) {}

  send(to: Slot | "all", payload: HostMessage): void {
    this.room.send(to, payload);
  }

  sendState(state: ControllerState): void {
    const serialized = JSON.stringify(state);
    if (serialized === this.lastState) return;
    this.lastState = serialized;
    this.send("all", state);
  }

  /** Makes the next state go out even if unchanged, for a phone that just joined. */
  forget(): void {
    this.lastState = "";
  }
}
