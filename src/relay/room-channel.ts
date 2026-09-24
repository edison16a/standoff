import type { Slot } from "@/shared/players";
import type { ServerEnvelope } from "@/shared/protocol";
import type { Bus } from "./backend";
import { channels, encode, type BusMessage } from "./channels";

/**
 * Publishing for one room: to the host, to one phone, or to both. Sends
 * are fire and forget. The bus keeps them in order, and a failed publish
 * is logged rather than allowed to stall the socket that sent it.
 */
export class RoomChannel {
  constructor(
    private readonly bus: Bus,
    readonly code: string,
  ) {}

  toHost(envelope: ServerEnvelope): void {
    this.post(channels.host(this.code), { kind: "deliver", envelope });
  }

  toSeat(slot: Slot, envelope: ServerEnvelope): void {
    this.post(channels.seat(this.code, slot), { kind: "deliver", envelope });
  }

  toPhones(envelope: ServerEnvelope): void {
    this.toSeat(1, envelope);
    this.toSeat(2, envelope);
  }

  /** Tells an older connection for the same seat (or host) to close. */
  kickHost(conn: string): void {
    this.post(channels.host(this.code), { kind: "kick", conn });
  }

  kickSeat(slot: Slot, conn: string): void {
    this.post(channels.seat(this.code, slot), { kind: "kick", conn });
  }

  private post(channel: string, message: BusMessage): void {
    this.bus.publish(channel, encode(message)).catch((error: unknown) => console.error("Publish failed", error));
  }
}
