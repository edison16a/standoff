import type { HostRoomApi, HostRoomEvent } from "@/platform/games/game-api";
import { BUTTONS, type Button } from "../engine/types";
import { phoneMessageSchema, type PhoneMessage } from "../protocol";
import type { Lobby } from "./lobby";
import type { MatchDriver } from "./match-driver";
import type { PhoneLink } from "./phone-link";

export interface InputTarget {
  readonly room: HostRoomApi;
  readonly lobby: Lobby;
  readonly phones: PhoneLink;
  /** The game being played, if any. */
  driver(): MatchDriver | null;
  /** Sends the new state to the big screen and the phones. */
  refresh(): void;
}

/**
 * Everything that comes in from the room: phones joining, leaving and
 * reconnecting, their setup choices, the shot release timing, the skip
 * vote, and the buttons. It changes the lobby or the game and asks for
 * a refresh; it never decides anything about play itself.
 */
export class RoomInput {
  constructor(private readonly host: InputTarget) {}

  onPress(seat: number, button: string, down: boolean, stick: { x: number; y: number }): void {
    const driver = this.host.driver();
    if (!driver || !(BUTTONS as readonly string[]).includes(button)) return;
    const replaying = driver.replays.replay !== null;
    if (down) driver.press(seat, button as Button, stick);
    // The phone's own release message usually lands first; this catches one that did not.
    else if (button === "shoot") driver.release(seat);
    // A skip vote shows at once on every screen.
    if (replaying) this.host.refresh();
  }

  onRoom(event: HostRoomEvent): void {
    const { lobby, phones, room } = this.host;
    const driver = this.host.driver();
    switch (event.type) {
      case "joined":
        lobby.connect(event.seat);
        driver?.setOnline(event.seat, true);
        phones.forget(event.seat);
        break;
      case "left":
        lobby.disconnect(event.seat);
        driver?.setOnline(event.seat, false);
        break;
      case "message": {
        const parsed = phoneMessageSchema.safeParse(event.payload);
        if (parsed.success) this.onPhone(event.seat, parsed.data);
        return;
      }
      case "resync":
        for (const player of room.players()) {
          if (player.connected) lobby.connect(player.seat);
          else lobby.disconnect(player.seat);
          driver?.setOnline(player.seat, player.connected);
        }
        phones.forget();
        break;
      case "players":
      case "online":
        break;
    }
    this.host.refresh();
  }

  private onPhone(seat: number, message: PhoneMessage): void {
    const { lobby, phones } = this.host;
    const driver = this.host.driver();
    switch (message.kind) {
      case "release":
        driver?.release(seat, message.heldMs);
        return;
      case "skip":
        driver?.replays.skip(seat);
        break;
      case "pick":
        lobby.pick(seat, message.character);
        break;
      case "ready":
        lobby.setReady(seat, message.ready);
        break;
      case "hello":
        phones.forget(seat);
        break;
    }
    this.host.refresh();
  }
}
