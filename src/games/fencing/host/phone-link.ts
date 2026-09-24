import type { SocketClient } from "@/platform/net/socket-client";
import type { Slot } from "@/games/fencing/players";
import type { ControllerState, HostMessage } from "@/games/fencing/protocol";

/**
 * The host's line to the phones. The screen state goes out only when it
 * changed, since it is rebuilt every frame during a match and most frames
 * change nothing a phone shows.
 */
export class PhoneLink {
  private lastState = "";

  constructor(private readonly socket: SocketClient) {}

  send(to: Slot | "all", payload: HostMessage): void {
    this.socket.send({ type: "host:send", to, payload });
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
