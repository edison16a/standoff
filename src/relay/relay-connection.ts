import type { Slot } from "@/shared/players";
import type { ClientEnvelope, HostMessage, ServerEnvelope } from "@/shared/protocol";
import { decode } from "./channels";
import { HostWatch } from "./host-watch";
import { logFailure } from "./log";
import { Membership } from "./membership";
import { RoomChannel } from "./room-channel";
import { makeToken } from "./room-code";
import { RoomOps } from "./room-ops";
import { connectedSlots } from "./room-state";
import { rotateLead, type RelayContext, type SocketLike } from "./relay-types";

export type { RelayContext, SocketLike } from "./relay-types";

/**
 * One socket's side of the relay. It never talks to another socket
 * directly: seats go through the store and messages through the bus. That
 * is what lets the host and the two phones sit on different server
 * instances, as they do on Vercel.
 *
 * Messages are handled one at a time in arrival order. Sends to the bus
 * are not awaited, so a slow round trip to Redis cannot back up a phone's
 * 60 Hz stream, while the bus client still keeps them in order.
 */
export class RelayConnection {
  readonly id = makeToken();
  private readonly ops: RoomOps;
  private readonly place: Membership;
  private queue: Promise<void> = Promise.resolve();
  private readonly watch: HostWatch;
  private rotateTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly socket: SocketLike,
    private readonly ctx: RelayContext,
  ) {
    this.ops = new RoomOps(ctx.backend.store, ctx.now);
    this.place = new Membership(this.id, this.ops, ctx.backend.bus, (raw) => this.onBus(raw));
    this.watch = new HostWatch(this.ops, ctx.backend.bus);
    if (ctx.deadline !== null) {
      const lifetime = ctx.deadline - ctx.now();
      const wait = Math.max(0, lifetime - rotateLead(lifetime));
      this.rotateTimer = setTimeout(() => this.send({ type: "server:rotate" }), wait);
    }
  }

  receive(envelope: ClientEnvelope): void {
    this.enqueue(() => this.handle(envelope));
  }

  disconnect(): void {
    if (this.rotateTimer) clearTimeout(this.rotateTimer);
    this.enqueue(() => this.leave());
  }

  /** Resolves once everything received so far has been handled. */
  settled(): Promise<void> {
    return this.queue;
  }

  private enqueue(task: () => Promise<void>): void {
    this.queue = this.queue.then(task).catch((error: unknown) => logFailure("Relay error", error));
  }

  private async handle(envelope: ClientEnvelope): Promise<void> {
    const role = this.place.role;
    switch (envelope.type) {
      case "host:create":
        return this.handshake(() => this.createRoom());
      case "host:resume":
        return this.handshake(() => this.resumeHost(envelope.code, envelope.token));
      case "phone:join":
        return this.handshake(() => this.joinAsPhone(envelope.code, envelope.token));
      case "host:close":
        if (role?.kind === "host" && (await this.ops.closeByHost(role.code, this.id))) {
          this.room(role.code).toPhones({ type: "room:closed" });
          await this.drop();
        }
        return;
      case "host:send":
        if (role?.kind === "host") this.relayFromHost(this.room(role.code), envelope.to, envelope.payload);
        return;
      case "phone:send":
        if (role?.kind === "phone") this.room(role.code).toHost({ type: "peer:message", slot: role.slot, payload: envelope.payload });
        return;
    }
  }

  /**
   * A create, resume or join that fails part way, say on a Redis error, is
   * undone and answered, so the client retries rather than waiting forever
   * with a seat claimed that nobody was told about.
   */
  private async handshake(task: () => Promise<void>): Promise<void> {
    try {
      await task();
    } catch (error) {
      logFailure("Handshake failed", error);
      this.watch.stop();
      await this.place.abandon().catch((undo: unknown) => logFailure("Undo failed", undo));
      this.send({ type: "room:error", reason: "unavailable" });
    }
  }

  private async createRoom(): Promise<void> {
    await this.leave();
    const room = (await this.ops.allowCreate(this.ctx.client)) ? await this.ops.create(this.id, this.ctx.joinUrlFor) : null;
    if (!room) {
      this.send({ type: "room:error", reason: "unavailable" });
      return;
    }
    await this.place.take({ kind: "host", code: room.code });
    const { sharedRooms } = this.ctx;
    this.send({ type: "room:created", code: room.code, token: room.hostToken, joinUrl: room.joinUrl, sharedRooms });
  }

  private async resumeHost(code: string, token: string): Promise<void> {
    await this.leave();
    const outcome = await this.ops.resumeHost(code, token, this.id);
    if (!outcome) {
      this.send({ type: "room:error", reason: "not-found" });
      return;
    }
    await this.place.take({ kind: "host", code });
    const channel = this.room(code);
    if (outcome.replaced) channel.kickHost(outcome.replaced);
    channel.toPhones({ type: "host:back" });
    const connected = connectedSlots(outcome.room);
    this.send({ type: "room:resumed", code, joinUrl: outcome.room.joinUrl, connected, sharedRooms: this.ctx.sharedRooms });
  }

  private async joinAsPhone(code: string, token: string | undefined): Promise<void> {
    await this.leave();
    const outcome = await this.ops.joinSeat(code, token, this.id);
    if (!outcome || !outcome.claim.ok) {
      const full = outcome && !outcome.claim.ok && outcome.claim.reason === "full";
      this.send({ type: "room:error", reason: full ? "full" : "not-found" });
      // Room codes are short, so wrong guesses from one address are capped.
      if (!(await this.ops.allowMiss(this.ctx.client))) this.socket.close(1008, "too many attempts");
      return;
    }
    const { slot, rejoined, replaced } = outcome.claim;
    await this.place.take({ kind: "phone", code, slot });
    const channel = this.room(code);
    if (replaced) channel.kickSeat(slot, replaced);
    channel.toHost({ type: "peer:joined", slot, rejoined });
    this.send({ type: "phone:joined", code, slot, token: outcome.claim.token });
    if (!outcome.hostHere) this.watch.start(code);
  }

  private relayFromHost(channel: RoomChannel, to: Slot | "all", payload: HostMessage): void {
    const envelope: ServerEnvelope = { type: "host:message", payload };
    if (to === "all") channel.toPhones(envelope);
    else channel.toSeat(to, envelope);
  }

  /** Called when this connection goes away or switches rooms. */
  private leave(): Promise<void> {
    this.watch.stop();
    return this.place.leave();
  }

  /** Forgets the current role without telling anyone, for kicks and closes. */
  private drop(): Promise<void> {
    this.watch.stop();
    return this.place.forget();
  }

  private onBus(raw: string): void {
    const message = decode(raw);
    if (!message) return;
    if (message.kind === "kick") {
      if (message.conn !== this.id) return;
      this.enqueue(() => this.drop());
      this.socket.close(4000, "replaced");
      return;
    }
    const { envelope } = message;
    if (this.place.role?.kind === "phone") {
      if (envelope.type === "host:away") this.watch.start(this.place.role.code);
      if (envelope.type === "host:back") this.watch.stop();
      if (envelope.type === "room:closed") this.enqueue(() => this.drop());
    }
    this.send(envelope);
  }

  private room(code: string): RoomChannel {
    return new RoomChannel(this.ctx.backend.bus, code);
  }

  private send(envelope: ServerEnvelope): void {
    try {
      this.socket.send(JSON.stringify(envelope));
    } catch {
      // The socket is closing. Its disconnect handler cleans up.
    }
  }
}
