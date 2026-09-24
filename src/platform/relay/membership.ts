import type { Seat } from "@/platform/protocol";
import type { Bus } from "./backend";
import { channels } from "./channels";
import { logFailure } from "./log";
import { RoomChannel } from "./room-channel";
import type { RoomOps } from "./room-ops";

/** `seats` is how many the room has, which messages to every phone need. */
export type Role = { kind: "host"; code: string; seats: number } | { kind: "phone"; code: string; seats: number; seat: Seat };

/**
 * The place one connection holds in a room, host or seat, along with its
 * subscription to that place's channel on the bus.
 */
export class Membership {
  role: Role | null = null;
  private unsubscribe: (() => Promise<void>) | null = null;

  constructor(
    private readonly conn: string,
    private readonly ops: RoomOps,
    private readonly bus: Bus,
    private readonly onBus: (raw: string) => void,
  ) {}

  async take(role: Role): Promise<void> {
    this.role = role;
    const channel = role.kind === "host" ? channels.host(role.code) : channels.seat(role.code, role.seat);
    this.unsubscribe = await this.bus.subscribe(channel, this.onBus);
  }

  /**
   * Forgets the place without telling anyone, for kicks and closes. It
   * never throws, so the release in `leave` always runs after it.
   */
  async forget(): Promise<void> {
    this.role = null;
    const unsubscribe = this.unsubscribe;
    this.unsubscribe = null;
    await unsubscribe?.().catch((error: unknown) => logFailure("Unsubscribe failed", error));
  }

  /**
   * Undoes a place the client was never told about. A seat is emptied
   * outright, since no phone has the token to come back to it.
   */
  async abandon(): Promise<void> {
    const role = this.role;
    if (role?.kind !== "phone") return this.leave();
    await this.forget();
    if (await this.ops.vacateSeat(role.code, role.seat, this.conn)) {
      new RoomChannel(this.bus, role.code, role.seats).toHost({ type: "peer:left", seat: role.seat });
    }
  }

  /** Gives the place back and tells the other side, when the connection goes or switches rooms. */
  async leave(): Promise<void> {
    const role = this.role;
    await this.forget();
    if (role?.kind === "host" && (await this.ops.releaseHost(role.code, this.conn))) {
      new RoomChannel(this.bus, role.code, role.seats).toPhones({ type: "host:away" });
    }
    if (role?.kind === "phone" && (await this.ops.releaseSeat(role.code, role.seat, this.conn))) {
      new RoomChannel(this.bus, role.code, role.seats).toHost({ type: "peer:left", seat: role.seat });
    }
  }
}
