import type { HostRoomApi } from "@/platform/games/game-api";
import type { Seat } from "@/platform/protocol";
import type { GunMessage, HostMessage, ScoreMessage, StateMessage } from "../protocol/messages";

/**
 * The host's line to the phones. State, gun and score messages are
 * rebuilt every frame but go out only when they changed, per phone, so
 * a held trigger costs one small message per shot and nothing more.
 */
export class PhoneLink {
  private lastState = "";
  private readonly lastGun = new Map<Seat, string>();
  private readonly lastScore = new Map<Seat, string>();

  constructor(private readonly room: HostRoomApi) {}

  send(to: Seat | "all", payload: HostMessage): void {
    this.room.send(to, payload);
  }

  state(state: StateMessage): void {
    const serial = JSON.stringify(state);
    if (serial === this.lastState) return;
    this.lastState = serial;
    this.send("all", state);
  }

  gun(seat: Seat, gun: GunMessage): void {
    this.once(this.lastGun, seat, gun);
  }

  score(seat: Seat, score: ScoreMessage): void {
    this.once(this.lastScore, seat, score);
  }

  /** Makes everything go out again, for a phone that joined or a resync. */
  forget(seat?: Seat): void {
    this.lastState = "";
    if (seat === undefined) {
      this.lastGun.clear();
      this.lastScore.clear();
    } else {
      this.lastGun.delete(seat);
      this.lastScore.delete(seat);
    }
  }

  private once(cache: Map<Seat, string>, seat: Seat, payload: HostMessage): void {
    const serial = JSON.stringify(payload);
    if (cache.get(seat) === serial) return;
    cache.set(seat, serial);
    this.send(seat, payload);
  }
}
