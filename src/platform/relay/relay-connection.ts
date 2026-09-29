import type { ClientEnvelope, Payload, Seat, ServerEnvelope } from "@/platform/protocol";
import { decode } from "./channels";
import { HostWatch } from "./host-watch";
import { logFailure } from "./log";
import { Membership } from "./membership";
import { RoomChannel } from "./room-channel";
import { makeToken } from "./room-code";
import { RoomOps } from "./room-ops";
import { echoProbe, RoomProbe } from "./relay-probe";
import { createRoom, joinAsPhone, remakeRoom, resumeHost, retireRoom, type RoomsContext } from "./relay-rooms";
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
  private readonly rooms: RoomsContext;
  private rotateTimer: ReturnType<typeof setTimeout> | null = null;
  private probe: RoomProbe | null = null;

  constructor(
    private readonly socket: SocketLike,
    private readonly ctx: RelayContext,
  ) {
    this.ops = new RoomOps(ctx.backend.store, ctx.now);
    this.place = new Membership(this.id, this.ops, ctx.backend.bus, (raw) => this.onBus(raw));
    this.watch = new HostWatch(this.ops, ctx.backend.bus);
    this.rooms = {
      id: this.id,
      ctx,
      ops: this.ops,
      place: this.place,
      watch: this.watch,
      send: (envelope) => this.send(envelope),
      close: (code, reason) => this.socket.close(code, reason),
      room: (target) => this.room(target),
      leave: () => this.leave(),
      drop: () => this.drop(),
    };
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
    this.probe?.cancel();
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
        return this.handshake(() => createRoom(this.rooms, envelope.game, envelope.seats));
      case "host:resume":
        return this.handshake(() => resumeHost(this.rooms, envelope.code, envelope.token));
      case "phone:join":
        return this.handshake(() => joinAsPhone(this.rooms, envelope));
      case "host:retire":
        return retireRoom(this.rooms, envelope);
      case "probe:room":
        // One check per connection: it is a throwaway, closed once answered.
        if (this.probe || role) return;
        this.probe = new RoomProbe(this.ops, this.ctx.backend.bus, this.ctx.now, (reply) => this.send(reply), (code) => this.socket.close(code));
        return this.probe.run(envelope);
      case "host:echo":
        if (role?.kind === "host") echoProbe(this.ctx.backend.bus, envelope.nonce);
        return;
      case "host:close":
        if (role?.kind === "host" && (await this.ops.closeByHost(role.code, this.id))) {
          this.room(role).toPhones({ type: "room:closed" });
          await this.drop();
        }
        return;
      case "host:remake":
        if (role?.kind === "host") return this.handshake(() => remakeRoom(this.rooms, role));
        return;
      case "host:send":
        if (role?.kind === "host") this.relayFromHost(this.room(role), envelope.to, envelope.payload);
        return;
      case "phone:send":
        if (role?.kind === "phone") this.room(role).toHost({ type: "peer:message", seat: role.seat, payload: envelope.payload });
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

  private relayFromHost(channel: RoomChannel, to: Seat | "all", payload: Payload): void {
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
      if (envelope.type === "host:away") this.watch.start(this.place.role.code, this.place.role.seats);
      if (envelope.type === "host:back") this.watch.stop();
      if (envelope.type === "room:closed" || envelope.type === "room:moved") this.enqueue(() => this.drop());
    }
    this.send(envelope);
  }

  private room({ code, seats }: { code: string; seats: number }): RoomChannel {
    return new RoomChannel(this.ctx.backend.bus, code, seats);
  }

  private send(envelope: ServerEnvelope): void {
    try {
      this.socket.send(JSON.stringify(envelope));
    } catch {
      // The socket is closing. Its disconnect handler cleans up.
    }
  }
}
