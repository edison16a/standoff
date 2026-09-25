import { MOVEMENT } from "./tuning";
import type { Button, Command } from "./types";

/**
 * Turns one phone's pad into commands. Pushing up is a jump: it fires
 * once as the stick crosses the flick line, and again only after the
 * stick comes back down, so a second push in the air is the double jump
 * and holding up never hops forever. Button presses between steps are
 * kept until the next read, so a quick tap is never lost.
 */
export class PadInput {
  private armed = true;
  private readonly pressed = new Set<Button>();

  press(button: Button): void {
    this.pressed.add(button);
  }

  /** The command for this step, from the stick as it is now. */
  read(x: number, y: number): Command {
    const jump = this.armed && y >= MOVEMENT.flick;
    if (jump) this.armed = false;
    if (y < MOVEMENT.deadZone) this.armed = true;
    const command: Command = { x: clamp(x), y: clamp(y) };
    if (jump) command.jump = true;
    for (const button of this.pressed) command[button] = true;
    this.pressed.clear();
    return command;
  }

  reset(): void {
    this.armed = true;
    this.pressed.clear();
  }
}

function clamp(v: number): number {
  return Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0;
}
