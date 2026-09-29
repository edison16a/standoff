import { Bot } from "../engine/bot";
import type { Run } from "../engine/run";
import { MOVE_GAP_S, REACTION } from "../engine/tuning";
import type { Round } from "./round";

/**
 * The test bot at the controls of the player's own run, for tuning the
 * feel in a browser without standing in front of a camera. It plays
 * within a person's limits on camera, so what it shows is what a player
 * gets. Turned on from the console in development only.
 */
export class Autopilot {
  private bot: Bot;
  private run: Run | null = null;

  constructor(private readonly flair = false) {
    this.bot = this.fresh(MOVE_GAP_S);
  }

  /** Steers this frame. Returns no input of its own, since the bot feeds the run directly. */
  drive(round: Round): null {
    if (this.run !== round.run) {
      this.run = round.run;
      // The level's own gap between moves, as in the tests, since Demon asks for moves closer together.
      this.bot = this.fresh(round.run.options.yard?.moveGap ?? MOVE_GAP_S);
    }
    if (!round.paused) this.bot.drive(round.run);
    return null;
  }

  private fresh(gapS: number): Bot {
    return new Bot({ flair: this.flair, human: { lagS: REACTION.cameraS, gapS } });
  }
}
