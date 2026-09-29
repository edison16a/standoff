import type { CameraKit } from "@/games/kit/camera";
import type { SoundDirector } from "../audio/sound-director";
import type { Round } from "./round";

/**
 * Keeps an eye on a round while it runs. A camera that fails mid run
 * sends no frames, so the player is never seen leaving. The run waits
 * until it works again, then counts the player back in if they are in
 * view. The music dulls while the run waits for its player.
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
    if (status && trouble !== this.trouble && running) round.setAway(trouble || !status.present[0]);
    this.trouble = trouble;
    const muffle = running && round.paused && !round.run.crashed;
    if (muffle !== this.muffled) this.sound.muffle(muffle);
    this.muffled = muffle;
  }
}
