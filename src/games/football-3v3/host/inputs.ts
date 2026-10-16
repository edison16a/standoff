import type { HostRoomEvent, Player } from "@/platform/games/game-api";
import { phoneMessageSchema, type PhoneMessage } from "../protocol";
import type { Lobby } from "./lobby";
import type { MatchDriver } from "./match-driver";
import type { PhoneLink } from "./phone-link";
import type { ReplayDirector } from "./replay/director";

/** The parts of the session that the room's events and the phones' messages reach. */
export interface InputTarget {
  readonly lobby: Lobby;
  readonly driver: MatchDriver | null;
  readonly phones: PhoneLink;
  readonly replays: ReplayDirector;
  players(): readonly Player[];
  /** During a replay a press is a vote to skip it. True when it was taken as one. */
  vote(seat: number, down: boolean): boolean;
  endReplay(): void;
}

/** A phone joined, left, spoke or the room came back. Returns whether the screens need refreshing. */
export function routeRoom(t: InputTarget, event: HostRoomEvent): boolean {
  switch (event.type) {
    case "joined":
      t.lobby.connect(event.seat);
      t.driver?.setOnline(event.seat, true);
      t.phones.forget(event.seat);
      return true;
    case "left":
      t.lobby.disconnect(event.seat);
      t.driver?.setOnline(event.seat, false);
      if (t.replays.left(event.seat)) t.endReplay();
      return true;
    case "message": {
      const parsed = phoneMessageSchema.safeParse(event.payload);
      return parsed.success && routePhone(t, event.seat, parsed.data);
    }
    case "resync":
      for (const player of t.players()) {
        if (player.connected) t.lobby.connect(player.seat);
        else t.lobby.disconnect(player.seat);
        t.driver?.setOnline(player.seat, player.connected);
      }
      t.phones.forget();
      return true;
    case "players":
    case "online":
      return true;
  }
}

/** A phone's own message: a pick, the QB's call, a kick, a throw button. Returns whether to refresh. */
export function routePhone(t: InputTarget, seat: number, message: PhoneMessage): boolean {
  const d = t.driver;
  switch (message.kind) {
    case "pick":
      t.lobby.pick(seat, message.build);
      return true;
    case "ready":
      t.lobby.setReady(seat, message.ready);
      return true;
    case "hello":
      t.phones.forget(seat);
      return true;
    case "throw":
      if (!t.vote(seat, true)) d?.throwTo(seat, message.slot);
      return true;
    case "call":
      if (!t.vote(seat, true)) d?.call(seat, message.call);
      return true;
    case "play":
      if (!t.vote(seat, true)) d?.playbook(seat, message.action);
      return true;
    case "kick":
      if (!t.vote(seat, true)) d?.kick(seat, message.value);
      return true;
  }
}
