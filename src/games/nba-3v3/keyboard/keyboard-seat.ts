import type { KeyboardContext, KeyboardPlayer } from "@/platform/keyboard";
import { StickKeys } from "@/platform/keyboard";
import type { Button } from "../engine/types";
import type { CourtState, PhoneState } from "../protocol";

/** Without Shift the keys jog: a firm push of the stick, short of a full sprint. */
export const JOG = 0.78;

/** What a key means to the player, before the play decides which phone button it is. */
export type Intent = "shoot" | "pass" | "guard" | "skill";

const INTENT_KEYS: Readonly<Record<string, Intent>> = {
  Space: "shoot",
  KeyJ: "shoot",
  KeyE: "pass",
  KeyK: "pass",
  KeyF: "guard",
  KeyQ: "skill",
};

/**
 * The phone button a key presses right now, the way the phone's buttons
 * change with the play: on defence Space jumps to block, E swipes for a
 * steal and F holds Guard; with the ball Space shoots, E passes and Q
 * makes a dribble move. Null when the key does nothing in this play.
 */
export function buttonFor(intent: Intent, court: CourtState | null): Button | null {
  if (!court) return null;
  if (court.freeThrow) return intent === "shoot" && court.freeThrow.ready ? "shoot" : null;
  if (court.defending) return intent === "shoot" ? "pass" : intent === "pass" ? "defend" : intent === "guard" ? "shoot" : null;
  if (court.hasBall) return intent === "skill" ? "defend" : intent === "guard" ? null : intent;
  // Off the ball on offence: E calls for it, Space or F jumps for a board.
  return intent === "pass" ? "pass" : intent === "shoot" || intent === "guard" ? "defend" : null;
}

/** Whether Shoot pressed now runs the meter, exactly as the phone decides it. */
export function meterRuns(court: CourtState | null): boolean {
  if (!court) return false;
  return court.freeThrow ? court.freeThrow.ready : !court.defending && court.hasBall;
}

/**
 * One keyboard seat in Basketball 3v3. It sends what the phone sends: the
 * gamepad kit's stick and button messages, and the measured hold of Shoot
 * so the host grades the release on the keyboard's own clock.
 */
export class NbaKeyboardSeat implements KeyboardPlayer {
  private readonly stick = new StickKeys();
  private sprint = false;
  /** Which phone button each held key pressed, so it lets go of the same one even if the play changed. */
  private readonly pressed = new Map<string, Button>();
  private shootAt: number | null = null;

  constructor(
    private readonly ctx: KeyboardContext,
    private readonly now: () => number = () => performance.now(),
  ) {}

  key(code: string, down: boolean): boolean {
    if (code === "ShiftLeft" || code === "ShiftRight") {
      this.sprint = down;
      return true;
    }
    if (this.stick.key(code, down)) return true;
    if (code === "Enter" && down) return this.menuKey();
    const intent = INTENT_KEYS[code];
    if (!intent) return false;
    if (down) this.down(code, intent);
    else this.up(code);
    return true;
  }

  /** The right mouse button holds Guard, like F. */
  pointer(event: { type: string; button: number }): void {
    if (event.button !== 2 || event.type === "move") return;
    if (event.type === "down") this.down("Mouse2", "guard");
    else this.up("Mouse2");
  }

  tick(): void {
    const { x, y } = this.vector();
    const court = this.court();
    // Like the phone: once the ball has left the hands, the hold is over.
    if (this.shootAt !== null && court && !court.hasBall) this.letGoOfShoot();
    this.ctx.sendLossy({ kind: "pad", x, y, held: [...new Set(this.pressed.values())] });
  }

  release(): void {
    for (const code of [...this.pressed.keys()]) this.up(code);
    this.stick.release();
    this.sprint = false;
  }

  dispose(): void {
    this.release();
  }

  vector(): { x: number; y: number } {
    const v = this.stick.vector();
    const k = this.sprint ? 1 : JOG;
    return { x: v.x * k, y: v.y * k };
  }

  private down(code: string, intent: Intent): void {
    if (this.pressed.has(code)) return;
    const court = this.court();
    const button = buttonFor(intent, court);
    if (!button) return;
    // Two keys on one button press it once.
    const already = [...this.pressed.values()].includes(button);
    this.pressed.set(code, button);
    if (already) return;
    if (button === "shoot" && meterRuns(court)) this.shootAt = this.now();
    this.ctx.send({ kind: "pad-press", button, down: true, ...this.vector() });
  }

  private up(code: string): void {
    const button = this.pressed.get(code);
    if (!button) return;
    this.pressed.delete(code);
    if ([...this.pressed.values()].includes(button)) return;
    if (button === "shoot") this.sendRelease();
    this.ctx.send({ kind: "pad-press", button, down: false, ...this.vector() });
  }

  /** The hold measured here goes first, then the button's own release, as on the phone. */
  private sendRelease(): void {
    if (this.shootAt === null) return;
    this.ctx.send({ kind: "release", heldMs: Math.min(5000, this.now() - this.shootAt) });
    this.shootAt = null;
  }

  private letGoOfShoot(): void {
    for (const [code, button] of this.pressed) if (button === "shoot") this.pressed.delete(code);
    this.sendRelease();
    this.ctx.send({ kind: "pad-press", button: "shoot", down: false, ...this.vector() });
  }

  /** Enter readies up in the lobby and votes to skip the replay. */
  private menuKey(): boolean {
    const state = this.state();
    if (!state) return false;
    if (state.phase === "replay" && state.replay && !state.replay.voted) this.ctx.send({ kind: "skip" });
    else if (state.phase === "lobby" && state.pick && !state.ready) this.ctx.send({ kind: "ready", ready: true });
    else return false;
    return true;
  }

  private state(): PhoneState | null {
    return (this.ctx.last("state") as PhoneState | null) ?? null;
  }

  private court(): CourtState | null {
    return this.state()?.court ?? null;
  }
}
