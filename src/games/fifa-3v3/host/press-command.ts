import { defending } from "../engine/guard";
import type { Athlete, Command, MatchState } from "../engine/types";
import { BUTTONS } from "../protocol";

/** A button going down or up on a phone, with the stick at that moment. */
export interface Press {
  button: string;
  down: boolean;
  x: number;
  y: number;
  /** For a release of Shoot/Pass, how long the phone saw it held. */
  held?: number;
}

/**
 * Turns one press into the command's buttons. The big button is Guard
 * when the other side has the ball in open play, and Shoot/Pass
 * otherwise; which one a press is gets decided as it goes down and is
 * remembered (in `guarding`) so its release ends the same thing, even if
 * the ball changed hands in between.
 */
export function applyPress(state: MatchState, a: Athlete, press: Press, command: Command, guarding: Set<number>): void {
  const aim = { x: press.x, z: -press.y };
  switch (press.button) {
    case BUTTONS.shoot: {
      if (press.down && state.phase === "play" && defending(state, a)) {
        guarding.add(a.id);
        command.guard = true;
        return;
      }
      if (!press.down && guarding.delete(a.id)) {
        command.guard = false;
        return;
      }
      if (press.down) command.shootDown = true;
      else command.shootUp = true;
      command.aim = aim;
      if (press.held !== undefined) command.held = press.held;
      return;
    }
    case BUTTONS.slide:
      if (!press.down) return;
      command.slide = true;
      if (Math.hypot(aim.x, aim.z) > 0.2) command.move = aim;
      return;
    case BUTTONS.steal:
      if (press.down) command.steal = true;
      return;
    case BUTTONS.jump:
      if (press.down) command.jump = true;
      return;
  }
}
