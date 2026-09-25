import type { CameraKit } from "@/games/kit/camera";
import type { SoundDirector } from "../audio/sound-director";
import type { Round } from "./round";

/**
 * Keeps an eye on a round while it runs. A camera that fails mid run
 * sends no frames, so nobody is ever seen leaving. Every run waits until
 * it works again, then each player in view is counted back in. The
 * music dulls while every run still going is waiting for its player.
 */
export class RunWatch {
  private trouble = false;
  private muffled = false;

  constructor(private readonly sound: SoundDirector) {}

  /** True while the camera or the body tracking has a problem. */
  get cameraTrouble(): boolean {
    return this.trouble;
  }

  update(kit: CameraKit | null, round: Round, running: boolean): void {
    const status = kit?.getSnapshot();
    const trouble = !!status && (!!status.camera.problem || status.model.state === "problem");
    if (status && trouble !== this.trouble && running) {
      round.seats.forEach((_, i) => round.setAway(i + 1, trouble || !status.present[i]));
    }
    this.trouble = trouble;
    const waiting = running && round.seats.every((seat, i) => seat.run.crashed || round.paused(i + 1));
    const muffle = waiting && round.seats.some((seat) => !seat.run.crashed);
    if (muffle !== this.muffled) this.sound.muffle(muffle);
    this.muffled = muffle;
  }
}
