import type { OpenInfo } from "@/platform/net/socket-types";
import type { ClientEnvelope } from "@/platform/protocol";
import type { CreateFailure, KeeperLink, RoomKeeperEvents, RoomMessage, Send } from "./keeper-types";
import { freshCourier, RetireQueue } from "./retire-queue";
import { preferStream } from "@/platform/net/transport-choice";
import type { RememberedRoom, RoomMemory } from "./room-memory";

export type { CreateFailure, KeeperLink, OpenedRoom, RoomKeeperEvents, RoomMessage, Send } from "./keeper-types";

/** How long a create may take before a fresh socket tries again, and how many tries in all. */
export const CREATE_WAIT_MS = 8000;
export const CREATE_TRIES = 3;
/**
 * Waits before each fresh socket a failed resume tries. Any instance of
 * the deployment makes the room again from its signed token, so "not
 * found" means another deployment or an ended room, and one more look is
 * enough. A server side failure gets a little longer. Past that the room
 * is lost, and the host should know within seconds, not show a dead code.
 */
export const RESUME_DELAYS = [500, 1500, 3000];
const NOT_FOUND_TRIES = 2;

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
  /** The server instance that last answered for the room, to tell when a new socket lands on another. */
  instance: string | null = null;
  /** Every server instance sees the same rooms, as the relay last said. */
  shared = true;
  /** Each seat's player name, for making the room again where it is not known. */
  names: (() => (string | null)[]) | null = null;
  private createTimer: ReturnType<typeof setTimeout> | null = null;
  private resumeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    public memory: RoomMemory,
    private readonly link: KeeperLink,
    public events: RoomKeeperEvents,
  ) {
    const courier = freshCourier(() => this.link.usesStream?.() ?? preferStream());
    this.retires = new RetireQueue((message) => this.link.send(message), courier);
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
    if (saved) send(this.resume(saved));
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

  /**
   * Ends a room by its token, sending again until the relay confirms.
   * `instance` is where that room lives, by default this keeper's own room.
   */
  retire(room: { code: string; token: string }, movedTo?: string, instance: string | null = this.instance): void {
    this.retires.add(room, movedTo, { instance, shared: this.shared });
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
        if (!this.pending) return this.retire({ code, token }, undefined, message.instance ?? null);
        const deferred = this.deferred;
        this.stopCreate();
        this.instance = message.instance ?? null;
        this.shared = message.sharedRooms;
        this.memory.remember({ code, token, game, seats });
        deferred?.(this.resume({ code, token, game, seats }));
        return this.events.opened({ ...message, connected: null, names: null });
      }
      case "room:resumed": {
        this.stopResume();
        this.instance = message.instance ?? null;
        this.shared = message.sharedRooms;
        const token = this.memory.recall()?.token ?? "";
        // An older tab saved no game, and a lost room needs it to be made again.
        if (token) this.memory.remember({ code: message.code, token, game: message.game, seats: message.seats });
        // A relay from before names were kept sends none.
        return this.events.opened({ ...message, token, names: message.names ?? null });
      }
      case "room:retired":
        return this.retires.confirm(message);
      case "room:error":
        if (this.memory.recall()) return this.resumeFailed(message.reason);
        if (!this.pending) return;
        if (message.reason === "limit") return this.giveUp("limit");
        return this.retryCreate("unavailable");
    }
  }

  /** What a socket says to take the room back, with enough to make it again where it is not known. */
  resume(room: RememberedRoom): Extract<ClientEnvelope, { type: "host:resume" }> {
    const { code, token, game, seats } = room;
    if (!game || !seats) return { type: "host:resume", code, token };
    const names = this.names?.();
    return { type: "host:resume", code, token, game, seats, ...(names ? { names } : {}) };
  }

  /** A few fresh sockets try, spaced out, before the room is called lost. */
  private resumeFailed(reason: string): void {
    const tries = reason === "not-found" ? NOT_FOUND_TRIES : RESUME_DELAYS.length;
    if (this.resumeTries < tries) {
      if (this.resumeTries === 0) this.events.doubt?.();
      this.resumeTimer = setTimeout(() => this.link.redial(), RESUME_DELAYS[this.resumeTries]!);
      this.resumeTries += 1;
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
