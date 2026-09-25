import { MOVEMENT } from "./tuning";
import type { Button, Command } from "./types";

/**
 * Turns one phone's pad into commands. Pushing up is a jump: it fires
 * once as the stick crosses the flick line, and again only after the
 * stick comes back down, so a second push in the air is the double jump
 * and holding up never hops forever. Button presses between steps are
 * kept until the next read, so a quick tap is never lost.
 *
 * The phone's direction pad also sends up as a reliable press, because
 * the streamed stick may drop the one sample a quick tap lives in. Either
 * one fires the jump, and neither fires it twice.
 */
export class PadInput {
  private armed = true;
  private jumpQueued = false;
  /** Up is held on the pad, so a stale low stick sample must not re-arm the jump. */
  private upHeld = false;
  private readonly pressed = new Set<Button>();

  press(button: Button): void {
    this.pressed.add(button);
  }

  /** Up went down on the phone. */
  upPressed(): void {
    this.upHeld = true;
    if (!this.armed) return;
    this.armed = false;
    this.jumpQueued = true;
  }

  /** Up was let go, so the next push is a fresh jump. */
  upReleased(): void {
    this.upHeld = false;
    this.armed = true;
  }

  /** The command for this step, from the stick as it is now. */
  read(x: number, y: number): Command {
    const jump = this.jumpQueued || (this.armed && y >= MOVEMENT.flick);
    this.jumpQueued = false;
    if (jump) this.armed = false;
    if (y < MOVEMENT.deadZone && !this.upHeld) this.armed = true;
    const command: Command = { x: clamp(x), y: clamp(y) };
    if (jump) command.jump = true;
    for (const button of this.pressed) command[button] = true;
    this.pressed.clear();
    return command;
  }

  reset(): void {
    this.armed = true;
    this.jumpQueued = false;
    this.upHeld = false;
    this.pressed.clear();
  }
}

function clamp(v: number): number {
  return Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0;
}
