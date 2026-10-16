import { ButtonKeys, StickKeys, type KeyboardContext, type KeyboardPlayer } from "@/platform/keyboard";
import { followMeter, tapMeter, type LocalMeter } from "../phone/kick-meter";
import { phoneStateSchema, type PadButton, type PhoneState } from "../protocol";
import { ThrowKeys } from "./throw-keys";

/** The keyboard's own buttons, before the game's state says what each one means right now. */
type Key = "act" | "juke" | "dive" | "tackle" | "sprint" | "guard";

const KEYS: Record<Key, readonly string[]> = {
  act: ["Space"],
  juke: ["KeyE"],
  dive: ["KeyQ"],
  tackle: ["KeyF"],
  sprint: ["ShiftLeft", "ShiftRight"],
  guard: ["KeyG"],
};

const DIGITS = ["Digit1", "Digit2", "Digit3", "Digit4"];

/** On the page of plays: R deals new plays, B goes back to Throw, Run and Kick. */
const BOOK_KEYS: Record<string, "redeal" | "back"> = { KeyR: "redeal", KeyB: "back" };

/** The pad button a key presses now, from the controls the phone shows; null for none. */
export function padFor(key: Key, s: PhoneState): PadButton | "skip" | null {
  if (s.skip) return key === "act" ? "skip" : null;
  if (key === "juke") return "juke";
  if (key === "dive") return s.pad === "runner" ? "dive" : null;
  if (key === "tackle") return s.pad === "defense" ? "tackle" : null;
  if (key === "guard") return s.pad === "defense" ? "guard" : null;
  if (key === "sprint") return s.pad === "qb" ? "run" : s.pad === "defense" ? "rush" : null;
  // Space: the QB's hike, or his pitch on a run call; a tackle on defence.
  if (s.pad === "qb") return s.phase === "presnap" ? "hike" : s.runPlay ? "pass" : null;
  return s.pad === "defense" ? "tackle" : null;
}

/**
 * One keyboard seat for Football 3v3. It sends exactly what the phone
 * would: the gamepad kit's stick and presses, the play call, the kick
 * meter's reading and the throw buttons. What each key does follows the
 * controls the phone shows right now, from the host's state.
 */
export class FootballKeys implements KeyboardPlayer {
  private readonly move = new StickKeys("wasd");
  private readonly buttons: ButtonKeys<Key>;
  /** The pad button each key pressed, so its release lets go of the same one. */
  private readonly down = new Map<Key, PadButton | "skip">();
  private readonly throws: ThrowKeys;
  private kick: LocalMeter | null = null;
  private stage: "aim" | "power" | null = null;

  constructor(
    private readonly ctx: KeyboardContext,
    private readonly now: () => number = () => performance.now(),
  ) {
    this.buttons = new ButtonKeys(KEYS, { press: (k) => this.press(k), release: (k) => this.lift(k) }, now);
    this.throws = new ThrowKeys((message) => ctx.send(message));
  }

  key(code: string, isDown: boolean): boolean {
    const digit = DIGITS.indexOf(code);
    if (digit >= 0) {
      if (isDown) this.number(digit);
      else this.throws.up(digit, this.state());
      return true;
    }
    // Escape lets go of a held throw; with none held it stays the controls card's.
    if (code === "Escape") return isDown && this.throws.cancel(this.state());
    const book = BOOK_KEYS[code];
    if (book && this.state()?.pad === "playbook") {
      if (isDown) this.ctx.send({ kind: "play", action: book });
      return true;
    }
    return this.move.key(code, isDown) || this.buttons.key(code, isDown);
  }

  tick(): void {
    this.followKick();
    this.throws.update(this.state());
    const s = this.move.vector();
    const held = [...this.down.values()].filter((b) => b === "guard");
    this.ctx.sendLossy({ kind: "pad", x: s.x, y: s.y, held });
  }

  /** Focus lost: every pad button lets go. */
  release(): void {
    for (const button of this.down.values()) this.pad(button, false);
    this.down.clear();
    this.throws.cancel(this.state());
    this.buttons.release();
    this.move.release();
  }

  private state(): PhoneState | null {
    const parsed = phoneStateSchema.safeParse(this.ctx.last("state"));
    return parsed.success ? parsed.data : null;
  }

  private press(key: Key): void {
    const s = this.state();
    if (!s) return;
    if (key === "act" && s.pad === "kicker") return this.tapKick();
    if (key === "act" && (s.pad === "choose" || s.pad === "playbook")) return this.number(0);
    const button = padFor(key, s);
    if (!button) return;
    this.down.set(key, button);
    this.pad(button, true);
  }

  private lift(key: Key): void {
    const button = this.down.get(key);
    this.down.delete(key);
    if (button) this.pad(button, false);
  }

  private pad(button: PadButton | "skip", isDown: boolean): void {
    const s = this.move.vector();
    this.ctx.send({ kind: "pad-press", button, down: isDown, x: s.x, y: s.y });
  }

  /**
   * A number key, as the phone shows things now: the play call (1 to 3),
   * a play off the page (1 or 2), or on the QB's pad the hold of a throw
   * to that runner (1 to 4, his number on the card and the field), which
   * goes when the key comes up (throw-keys.ts).
   */
  private number(index: number): void {
    const s = this.state();
    if (s?.pad === "playbook") {
      if (s.book && index < s.book.plays.length) this.ctx.send({ kind: "play", action: index });
      return;
    }
    if (s?.pad === "qb") return this.throws.down(index, s);
    const call = s?.pad === "choose" ? s.choose?.options[index] : undefined;
    if (call) this.ctx.send({ kind: "call", call });
  }

  /** The kick meters on this seat's own clock, started as the phone starts them. */
  private followKick(): void {
    const now = this.state()?.meter?.stage ?? null;
    this.kick = followMeter(this.kick, this.stage, now, this.now());
    this.stage = now;
  }

  private tapKick(): void {
    const tap = tapMeter(this.kick, this.now());
    if (!tap) return;
    this.kick = tap.next;
    this.ctx.send({ kind: "kick", value: Math.max(-1, Math.min(1, tap.value)) });
  }
}
