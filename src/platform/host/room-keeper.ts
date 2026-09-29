import type { OpenInfo } from "@/platform/net/socket-types";
import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";
import { RetireQueue } from "./retire-queue";
import type { RememberedRoom, RoomMemory } from "./room-memory";

/** How long a create may take before a fresh socket tries again, and how many tries in all. */
export const CREATE_WAIT_MS = 8000;
export const CREATE_TRIES = 3;
/**
 * Waits before each fresh socket a failed resume tries, about 9 s in all.
 * Rooms live in one server instance's memory, so a fresh socket may reach
 * the instance that has the room. Past that the room is lost, and the host
 * should know soon rather than show a dead code.
 */
export const RESUME_DELAYS = [400, 800, 1600, 3000, 3000];

export type Send = (message: ClientEnvelope) => void;
export type RoomMessage = Extract<ServerEnvelope, { type: "room:created" | "room:resumed" | "room:error" | "room:retired" }>;
export type CreateFailure = "timeout" | "limit" | "unavailable";

export interface OpenedRoom extends RememberedRoom {
  joinUrl: string;
  sharedRooms: boolean;
  /** Which seats already have a phone, and their names. Only known when resuming. */
  connected: boolean[] | null;
  names: (string | null)[] | null;
}

export interface RoomKeeperEvents {
  opened(room: OpenedRoom): void;
  /** The room is gone for good. `old` is what was remembered, so it can be made again. */
  lost(info: { old: RememberedRoom | null }): void;
  /** A create never got its room. */
  failed(reason: CreateFailure): void;
}

/** The connection a keeper talks through: the current socket, and a way to get a fresh one. */
export interface KeeperLink {
  send: Send;
  redial(): void;
}

/**
 * Holds on to the host's room across page reloads, dropped sockets and
 * server instances. Every new socket either resumes the remembered room
 * or, while a create is waiting, asks for one. Only one create is ever
 * out at a time, and a room nobody asked for is ended at once, so a
 * handover or a lost reply can never leave a second room behind.
 */
export class RoomKeeper {
  private pending: { game: string; seats: number } | null = null;
  /** A handover socket that opened while the create was out resumes once the room exists. */
  private deferred: Send | null = null;
  private readonly retires: RetireQueue;
  private createTries = 0;
  private resumeTries = 0;
  /** Null until the relay has said whether rooms are shared. */
  private shared: boolean | null = null;
  private createTimer: ReturnType<typeof setTimeout> | null = null;
  private resumeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    public memory: RoomMemory,
    private readonly link: KeeperLink,
    public events: RoomKeeperEvents,
  ) {
    this.retires = new RetireQueue((message) => this.link.send(message));
  }

  /** True while there is a room to resume, from before a reload or a dropped socket. */
  get holding(): boolean {
    return this.memory.recall() !== null;
  }

  get creating(): boolean {
    return this.pending !== null;
  }

  /** What a new socket says first. */
  announce(send: Send, { handover }: OpenInfo): void {
    for (const message of this.retires.pending()) send(message);
    const saved = this.memory.recall();
    if (saved) send({ type: "host:resume", code: saved.code, token: saved.token });
    // A second create on a handover socket would make a second room.
    else if (this.pending && handover) this.deferred = send;
    else if (this.pending) send({ type: "host:create", ...this.pending });
  }

  /** Asks for a room. False while one is already on its way. */
  create(game: string, seats: number): boolean {
    if (this.pending) return false;
    this.pending = { game, seats };
    this.createTries = 0;
    this.link.send({ type: "host:create", game, seats });
    this.waitForCreate();
    return true;
  }

  /** Ends a room by its token, sending again until the relay confirms. */
  retire(room: { code: string; token: string }, movedTo?: string): void {
    this.retires.add(room, movedTo);
  }

  /** Takes on a room that was made and checked elsewhere (see RoomCandidate). */
  adopt(room: RememberedRoom): void {
    this.memory.remember(room);
  }

  /** Forgets the room and any create, for leaving to the home screen. */
  forget(): void {
    this.memory.forget();
    this.stopCreate();
    this.stopResume();
  }

  dispose(): void {
    this.stopCreate();
    this.stopResume();
    this.retires.stop();
  }

  handle(message: RoomMessage): void {
    switch (message.type) {
      case "room:created": {
        const { code, token, game, seats } = message;
        // Nobody is waiting for this room, say a create answered after its
        // retry had already been answered. Left open it would be a ghost.
        if (!this.pending) return this.retire({ code, token });
        this.stopCreate();
        this.shared = message.sharedRooms;
        this.memory.remember({ code, token, game, seats });
        this.deferred?.({ type: "host:resume", code, token });
        this.deferred = null;
        return this.events.opened({ ...message, connected: null, names: null });
      }
      case "room:resumed": {
        this.stopResume();
        this.shared = message.sharedRooms;
        const token = this.memory.recall()?.token ?? "";
        // An older tab saved no game, and a lost room needs it to be made again.
        if (token) this.memory.remember({ code: message.code, token, game: message.game, seats: message.seats });
        // A relay from before names were kept sends none.
        return this.events.opened({ ...message, token, names: message.names ?? null });
      }
      case "room:retired":
        this.retires.confirm(message.code);
        return;
      case "room:error":
        if (this.memory.recall()) return this.resumeFailed(message.reason);
        if (!this.pending) return;
        if (message.reason === "limit") return this.giveUp("limit");
        return this.retryCreate("unavailable");
    }
  }

  /**
   * A resume that cannot find the room may just have landed on the wrong
   * server instance, so a few fresh sockets try, spaced out. With a shared
   * store "not found" is final, and one quick look again is enough.
   */
  private resumeFailed(reason: string): void {
    const delays = this.shared === true && reason === "not-found" ? RESUME_DELAYS.slice(0, 1) : RESUME_DELAYS;
    if (this.resumeTries < delays.length) {
      const wait = delays[this.resumeTries]!;
      this.resumeTries += 1;
      this.resumeTimer = setTimeout(() => this.link.redial(), wait);
      return;
    }
    const old = this.memory.recall();
    this.forget();
    this.events.lost({ old });
  }

  private waitForCreate(): void {
    if (this.createTimer) clearTimeout(this.createTimer);
    this.createTimer = setTimeout(() => this.retryCreate("timeout"), CREATE_WAIT_MS);
  }

  /** A fresh socket may land on a healthy server instance. It announces the create itself. */
  private retryCreate(reason: CreateFailure): void {
    if (this.createTries + 1 >= CREATE_TRIES) return this.giveUp(reason);
    this.createTries += 1;
    this.deferred = null;
    this.waitForCreate();
    this.link.redial();
  }

  private giveUp(reason: CreateFailure): void {
    this.stopCreate();
    this.events.failed(reason);
  }

  private stopCreate(): void {
    if (this.createTimer) clearTimeout(this.createTimer);
    this.createTimer = null;
    this.pending = null;
    this.deferred = null;
    this.createTries = 0;
  }

  private stopResume(): void {
    if (this.resumeTimer) clearTimeout(this.resumeTimer);
    this.resumeTimer = null;
    this.resumeTries = 0;
  }
}
