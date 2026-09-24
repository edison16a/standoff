import type { Seat, ServerEnvelope } from "@/platform/protocol";
import type { Bus } from "./backend";
import { channels, encode, type BusMessage } from "./channels";
import { logFailure } from "./log";

/**
 * Publishing for one room: to the host, to one phone, or to every seat. Sends
 * are fire and forget. The bus keeps them in order, and a failed publish
 * is logged rather than allowed to stall the socket that sent it.
 */
export class RoomChannel {
  constructor(
    private readonly bus: Bus,
    readonly code: string,
    /** How many seats the room has, for messages to every phone. */
    private readonly seats: number,
  ) {}

  toHost(envelope: ServerEnvelope): void {
    this.post(channels.host(this.code), { kind: "deliver", envelope });
  }

  toSeat(seat: Seat, envelope: ServerEnvelope): void {
    this.post(channels.seat(this.code, seat), { kind: "deliver", envelope });
  }

  toPhones(envelope: ServerEnvelope): void {
    for (let seat = 1; seat <= this.seats; seat++) this.toSeat(seat, envelope);
  }

  /** Tells an older connection for the same seat (or host) to close. */
  kickHost(conn: string): void {
    this.post(channels.host(this.code), { kind: "kick", conn });
  }

  kickSeat(seat: Seat, conn: string): void {
    this.post(channels.seat(this.code, seat), { kind: "kick", conn });
  }

  private post(channel: string, message: BusMessage): void {
    this.bus.publish(channel, encode(message)).catch((error: unknown) => logFailure("Publish failed", error));
  }
}
