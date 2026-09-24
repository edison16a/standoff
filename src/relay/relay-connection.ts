import type { Slot } from "@/shared/players";
import type { ClientEnvelope, HostMessage, ServerEnvelope } from "@/shared/protocol";
import { channels, decode } from "./channels";
import { RoomChannel } from "./room-channel";
import { makeToken } from "./room-code";
import { RoomOps } from "./room-ops";
import { connectedSlots, HOST_GRACE_MS } from "./room-state";
import type { RelayContext, SocketLike } from "./relay-types";

export type { RelayContext, SocketLike } from "./relay-types";

type Role = { kind: "host"; code: string } | { kind: "phone"; code: string; slot: Slot };

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
  private role: Role | null = null;
  private unsubscribe: (() => Promise<void>) | null = null;
  private queue: Promise<void> = Promise.resolve();
  private hostWatch: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly socket: SocketLike,
    private readonly ctx: RelayContext,
  ) {
    this.ops = new RoomOps(ctx.backend.store, ctx.now);
  }

  receive(envelope: ClientEnvelope): void {
    this.enqueue(() => this.handle(envelope));
  }

  disconnect(): void {
    this.enqueue(() => this.leave());
  }

  /** Resolves once everything received so far has been handled. */
  settled(): Promise<void> {
    return this.queue;
  }

  private enqueue(task: () => Promise<void>): void {
    this.queue = this.queue.then(task).catch((error: unknown) => console.error("Relay error", error));
  }

  private async handle(envelope: ClientEnvelope): Promise<void> {
    const role = this.role;
    switch (envelope.type) {
      case "host:create":
        return this.createRoom();
      case "host:resume":
        return this.resumeHost(envelope.code, envelope.token);
      case "phone:join":
        return this.joinAsPhone(envelope.code, envelope.token);
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

  private async createRoom(): Promise<void> {
    await this.leave();
    const room = await this.ops.create(this.id, this.ctx.joinUrlFor);
    if (!room) {
      this.send({ type: "room:error", reason: "full" });
      return;
    }
    await this.become({ kind: "host", code: room.code });
    this.send({ type: "room:created", code: room.code, token: room.hostToken, joinUrl: room.joinUrl });
  }

  private async resumeHost(code: string, token: string): Promise<void> {
    await this.leave();
    const outcome = await this.ops.resumeHost(code, token, this.id);
    if (!outcome) {
      this.send({ type: "room:error", reason: "not-found" });
      return;
    }
    await this.become({ kind: "host", code });
    const channel = this.room(code);
    if (outcome.replaced) channel.kickHost(outcome.replaced);
    channel.toPhones({ type: "host:back" });
    this.send({ type: "room:resumed", code, joinUrl: outcome.room.joinUrl, connected: connectedSlots(outcome.room) });
  }

  private async joinAsPhone(code: string, token: string | undefined): Promise<void> {
    await this.leave();
    const outcome = await this.ops.joinSeat(code, token, this.id);
    if (!outcome || !outcome.claim.ok) {
      const full = outcome && !outcome.claim.ok && outcome.claim.reason === "full";
      this.send({ type: "room:error", reason: full ? "full" : "not-found" });
      return;
    }
    const { slot, rejoined, replaced } = outcome.claim;
    await this.become({ kind: "phone", code, slot });
    const channel = this.room(code);
    if (replaced) channel.kickSeat(slot, replaced);
    channel.toHost({ type: "peer:joined", slot, rejoined });
    this.send({ type: "phone:joined", code, slot, token: outcome.claim.token });
    if (!outcome.hostHere) this.watchHost(code);
  }

  private relayFromHost(channel: RoomChannel, to: Slot | "all", payload: HostMessage): void {
    const envelope: ServerEnvelope = { type: "host:message", payload };
    if (to === "all") channel.toPhones(envelope);
    else channel.toSeat(to, envelope);
  }

  /** Called when this connection goes away or switches rooms. */
  private async leave(): Promise<void> {
    const role = this.role;
    await this.drop();
    if (role?.kind === "host" && (await this.ops.releaseHost(role.code, this.id))) {
      this.room(role.code).toPhones({ type: "host:away" });
    }
    if (role?.kind === "phone" && (await this.ops.releaseSeat(role.code, role.slot, this.id))) {
      this.room(role.code).toHost({ type: "peer:left", slot: role.slot });
    }
  }

  private async become(role: Role): Promise<void> {
    this.role = role;
    const channel = role.kind === "host" ? channels.host(role.code) : channels.seat(role.code, role.slot);
    this.unsubscribe = await this.ctx.backend.bus.subscribe(channel, (raw) => this.onBus(raw));
  }

  /** Forgets the current role without telling anyone, for kicks and closes. */
  private async drop(): Promise<void> {
    this.role = null;
    if (this.hostWatch) clearTimeout(this.hostWatch);
    this.hostWatch = null;
    const unsubscribe = this.unsubscribe;
    this.unsubscribe = null;
    await unsubscribe?.();
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
    if (this.role?.kind === "phone") {
      if (envelope.type === "host:away") this.watchHost(this.role.code);
      if (envelope.type === "host:back" && this.hostWatch) clearTimeout(this.hostWatch);
      if (envelope.type === "room:closed") this.enqueue(() => this.drop());
    }
    this.send(envelope);
  }

  /**
   * When the host drops, each phone's connection keeps an eye on the room.
   * If the host has not come back once the grace period is over, whichever
   * phone checks first closes the room for everyone. There is no central
   * timer to lean on, because on Vercel there is no central process.
   */
  private watchHost(code: string): void {
    if (this.hostWatch) clearTimeout(this.hostWatch);
    this.hostWatch = setTimeout(() => {
      this.enqueue(async () => {
        if (await this.ops.closeIfHostGone(code)) this.room(code).toPhones({ type: "room:closed" });
      });
    }, HOST_GRACE_MS + 1000);
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
