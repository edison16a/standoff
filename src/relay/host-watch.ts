import type { Bus } from "./backend";
import { logFailure } from "./log";
import { RoomChannel } from "./room-channel";
import type { RoomOps } from "./room-ops";
import { HOST_GRACE_MS } from "./room-state";

/**
 * When the host drops, each phone's connection keeps an eye on the room.
 * If the host has not come back once the grace period is over, whichever
 * phone checks first closes the room for everyone. There is no central
 * timer to lean on, because on Vercel there is no central process.
 */
export class HostWatch {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private watching: string | null = null;

  constructor(
    private readonly ops: RoomOps,
    private readonly bus: Bus,
  ) {}

  start(code: string): void {
    this.stop();
    this.watching = code;
    this.timer = setTimeout(() => void this.check(code), HOST_GRACE_MS + 1000);
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.watching = null;
  }

  private async check(code: string): Promise<void> {
    try {
      if (await this.ops.closeIfHostGone(code)) new RoomChannel(this.bus, code).toPhones({ type: "room:closed" });
    } catch (error) {
      // Look again later rather than leave the phones waiting on a host forever.
      logFailure("Host check failed", error);
      if (this.watching === code) this.start(code);
    }
  }
}
