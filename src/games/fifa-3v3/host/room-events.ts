import type { HostRoomEvent, Player } from "@/platform/games/game-api";
import { phoneMessageSchema, type PhoneMessage } from "../protocol";
import type { Lobby } from "./lobby";
import type { MatchDriver } from "./match-driver";
import type { PhoneLink } from "./phone-link";
import type { ReplayDirector } from "./replay-director";

/** The parts of the session that phones coming, going and choosing touch. */
export interface Seats {
  lobby: Lobby;
  driver: MatchDriver | null;
  phones: PhoneLink;
  replays: ReplayDirector;
  players(): readonly Player[];
}

/**
 * A phone joined, left or sent a message, or the room resynced after a
 * reconnect: the lobby, the match and the phone links follow. Returns
 * whether the screens need refreshing.
 */
export function onRoomEvent(event: HostRoomEvent, s: Seats): boolean {
  switch (event.type) {
    case "joined":
      s.lobby.connect(event.seat);
      s.driver?.setOnline(event.seat, true);
      s.phones.forget(event.seat);
      return true;
    case "left":
      s.lobby.disconnect(event.seat);
      s.driver?.setOnline(event.seat, false);
      if (s.driver) s.replays.left(s.driver, event.seat);
      return true;
    case "message": {
      const parsed = phoneMessageSchema.safeParse(event.payload);
      return parsed.success && onPhone(event.seat, parsed.data, s);
    }
    case "resync":
      for (const player of s.players()) {
        if (player.connected) s.lobby.connect(player.seat);
        else s.lobby.disconnect(player.seat);
        s.driver?.setOnline(player.seat, player.connected);
      }
      s.phones.forget();
      return true;
    case "players":
    case "online":
      return true;
  }
}

function onPhone(seat: number, message: PhoneMessage, s: Seats): boolean {
  switch (message.kind) {
    case "pick":
      s.lobby.pick(seat, message.build);
      return true;
    case "ready":
      s.lobby.setReady(seat, message.ready);
      return true;
    case "hello":
      s.phones.forget(seat);
      return true;
    case "release":
      // Mid match only, and nothing on screen changes, so no refresh either.
      s.driver?.noteHeld(seat, message.heldMs / 1000);
      return false;
  }
}
