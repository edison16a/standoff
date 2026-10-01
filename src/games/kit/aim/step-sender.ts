import type { PhoneRoomApi } from "@/platform/games/game-api";
import type { AimStep } from "./protocol";
import { stamper } from "./step-stamp";

/** Each step goes out a second time this much later. */
export const STEP_REPEAT_MS = 1000;

/**
 * Tells the big screen which calibration step this phone is on. Every
 * send is stamped, so the host drops a step that arrives late, and is
 * repeated once a moment later, since a send on a socket that is closing
 * is lost without a word. The last step goes again after a reconnect.
 */
export class StepSender {
  private current: AimStep | null = null;
  private readonly stamp = stamper();
  private repeat: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly room: Pick<PhoneRoomApi, "send">) {}

  announce(step: AimStep): void {
    this.current = step;
    this.send(step);
    this.cancel();
    this.repeat = setTimeout(() => {
      this.repeat = null;
      if (this.current === step) this.send(step);
    }, STEP_REPEAT_MS);
  }

  /** Sends the last step again, for a phone back after a reconnect. */
  resend(): void {
    if (this.current) this.send(this.current);
  }

  cancel(): void {
    if (this.repeat) clearTimeout(this.repeat);
    this.repeat = null;
  }

  private send(step: AimStep): void {
    this.room.send({ kind: "aim-step", step, ...this.stamp() });
  }
}
