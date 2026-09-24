import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";
import { forgetRoom, recallRoom, rememberRoom } from "./room-memory";

/** Fresh sockets to try when resuming cannot find the room. */
const RESUME_RETRIES = 6;

type Send = (message: ClientEnvelope) => void;

export type RoomMessage = Extract<ServerEnvelope, { type: "room:created" | "room:resumed" | "room:error" }>;

export interface OpenedRoom {
  code: string;
  game: string;
  seats: number;
  joinUrl: string;
  sharedRooms: boolean;
  /** Which seats already have a phone. Only known when resuming. */
  connected: boolean[] | null;
}

export interface RoomKeeperEvents {
  opened(room: OpenedRoom): void;
  /** The room is gone for good. `error` is set when the player was waiting for one. */
  lost(error: string | null): void;
}

/**
 * Holds on to the host's room across page reloads, dropped sockets and
 * server instances. Every new socket either resumes the remembered room
 * or, if the player asked for a game, creates one.
 */
export class RoomKeeper {
  /** The game and seat count asked for, until a room exists. */
  private wanted: { game: string; seats: number } | null = null;
  private retries = 0;

  constructor(
    /** Opens a fresh socket, possibly on another server instance. */
    private readonly redial: () => void,
    private readonly events: RoomKeeperEvents,
  ) {}

  /** True while there is a room to resume, from before a reload or a dropped socket. */
  get holding(): boolean {
    return recallRoom() !== null;
  }

  /** What a new socket says first. */
  announce(send: Send): void {
    const saved = recallRoom();
    if (saved) send({ type: "host:resume", code: saved.code, token: saved.token });
    else if (this.wanted) send({ type: "host:create", ...this.wanted });
  }

  create(send: Send, game: string, seats: number): void {
    this.wanted = { game, seats };
    send({ type: "host:create", game, seats });
  }

  close(send: Send): void {
    send({ type: "host:close" });
    forgetRoom();
    this.wanted = null;
  }

  handle(message: RoomMessage): void {
    switch (message.type) {
      case "room:created": {
        rememberRoom({ code: message.code, token: message.token });
        const { code, game, seats, joinUrl, sharedRooms } = message;
        this.events.opened({ code, game, seats, joinUrl, sharedRooms, connected: null });
        return;
      }
      case "room:resumed": {
        this.retries = 0;
        const { code, game, seats, joinUrl, sharedRooms, connected } = message;
        this.events.opened({ code, game, seats, joinUrl, sharedRooms, connected });
        return;
      }
      case "room:error":
        // A resume that cannot find the room may just have landed on the
        // wrong server instance. Try a few fresh sockets before giving up.
        if (recallRoom() && this.retries < RESUME_RETRIES) {
          this.retries += 1;
          this.redial();
          return;
        }
        this.retries = 0;
        forgetRoom();
        this.events.lost(this.wanted ? "Could not open a room. Try again." : null);
        return;
    }
  }
}
