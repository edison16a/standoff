import { ButtonKeys, MouseAim, StickKeys, type KeyboardContext, type KeyboardPlayer, type StagePointer } from "@/platform/keyboard";
import { followMeter, tapMeter, type LocalMeter } from "../phone/kick-meter";
import { phoneStateSchema, type PadButton, type PhoneState } from "../protocol";
import { mouseStick, ThrowKeys } from "./throw-keys";

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

const DIGITS = ["Digit1", "Digit2", "Digit3"];

/** The pad button a key presses now, from the controls the phone shows; null for none. */
export function padFor(key: Key, s: PhoneState): PadButton | "skip" | null {
  if (s.skip) return key === "act" ? "skip" : null;
  if (key === "juke") return "juke";
  if (key === "dive") return s.pad === "runner" ? "dive" : null;
  if (key === "tackle") return s.pad === "defense" ? "tackle" : null;
  if (key === "guard") return s.pad === "defense" ? "guard" : null;
  if (key === "sprint") return s.pad === "qb" ? "run" : s.pad === "defense" ? "rush" : null;
  // Space: the QB's main action, or a tackle on defence.
  if (s.pad === "qb") return s.phase === "presnap" ? "hike" : s.runPlay ? "pass" : null;
  return s.pad === "defense" ? "tackle" : null;
}

/**
 * One keyboard seat for Football 3v3. It sends exactly what the phone
 * would: the gamepad kit's stick and presses, the play call, the kick
 * meter's reading and the throw stick. What each key does
 * follows the controls the phone shows right now, from the host's state.
 */
export class FootballKeys implements KeyboardPlayer {
  private readonly move = new StickKeys("wasd");
  private readonly arrows = new StickKeys("arrows");
  private readonly buttons: ButtonKeys<Key>;
  private readonly mouse: MouseAim;
  private readonly thrower: ThrowKeys;
  /** The pad button each key pressed, so its release lets go of the same one. */
  private readonly down = new Map<Key | "mouse", PadButton | "skip" | "throw">();
  private pointed = false;
  private kick: LocalMeter | null = null;
  private stage: "aim" | "power" | null = null;

  constructor(
    private readonly ctx: KeyboardContext,
    private readonly now: () => number = () => performance.now(),
  ) {
    this.thrower = new ThrowKeys(ctx);
    this.buttons = new ButtonKeys(KEYS, { press: (k) => this.press(k), release: (k) => this.lift(k) }, now);
    this.mouse = new MouseAim({
      aim: () => (this.pointed = true),
      button: (button, isDown) => {
        if (button !== 0) return;
        if (isDown) this.startThrow("mouse");
        else this.lift("mouse");
      },
    }, now);
  }

  key(code: string, isDown: boolean): boolean {
    const digit = DIGITS.indexOf(code);
    if (digit >= 0) {
      if (isDown) this.call(digit);
      return true;
    }
    return this.move.key(code, isDown) || this.arrows.key(code, isDown) || this.buttons.key(code, isDown);
  }

  pointer(event: StagePointer): void {
    this.mouse.pointer(event);
  }

  tick(): void {
    this.mouse.tick();
    this.followKick();
    const s = this.move.vector();
    const held = [...this.down.values()].filter((b) => b === "guard");
    this.ctx.sendLossy({ kind: "pad", x: s.x, y: s.y, held });
    this.thrower.tick(this.aim());
  }

  /** Focus lost: a held throw is called off, not thrown, and every pad button lets go. */
  release(): void {
    this.thrower.cancel();
    for (const button of this.down.values()) if (button !== "throw") this.pad(button, false);
    this.down.clear();
    this.buttons.release();
    this.move.release();
    this.arrows.release();
  }

  private state(): PhoneState | null {
    const parsed = phoneStateSchema.safeParse(this.ctx.last("state"));
    return parsed.success ? parsed.data : null;
  }

  /** The arrows if held, else the mouse once it has moved, else nothing (the throw then goes up the field). */
  private aim() {
    if (this.arrows.active) return this.arrows.vector();
    return this.pointed ? mouseStick(this.mouse.point) : null;
  }

  private press(key: Key): void {
    const s = this.state();
    if (!s) return;
    if (key === "act" && s.pad === "kicker") return this.tapKick();
    if (key === "act" && s.pad === "choose") return this.call(0);
    if (key === "act" && s.pad === "qb" && s.canThrow && !s.runPlay && s.phase === "live") return this.startThrow("act");
    const button = padFor(key, s);
    if (!button) return;
    this.down.set(key, button);
    this.pad(button, true);
  }

  private startThrow(from: Key | "mouse"): void {
    const s = this.state();
    if (!s || s.pad !== "qb" || !s.canThrow || s.runPlay || this.thrower.holding) return;
    this.down.set(from, "throw");
    this.thrower.start();
  }

  private lift(key: Key | "mouse"): void {
    const button = this.down.get(key);
    this.down.delete(key);
    if (button === "throw") this.thrower.release(this.aim());
    else if (button) this.pad(button, false);
  }

  private pad(button: PadButton | "skip", isDown: boolean): void {
    const s = this.move.vector();
    this.ctx.send({ kind: "pad-press", button, down: isDown, x: s.x, y: s.y });
  }

  /** 1, 2 and 3 pick the play call in the order the phone shows them. */
  private call(index: number): void {
    const s = this.state();
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
