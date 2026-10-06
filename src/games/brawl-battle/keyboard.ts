import { ButtonKeys, StickKeys, type KeyboardBinding, type KeyboardContext, type KeyboardPlayer } from "@/platform/keyboard";
import { MOVEMENT } from "./engine/tuning";
import { BUTTONS, phoneStateSchema, type ButtonName, type PhoneState } from "./protocol";

type KeyButton = "attack" | "special" | "ult" | "jump" | "shield";

const KEYS: Record<KeyButton, readonly string[]> = {
  attack: ["KeyJ", "KeyF"],
  special: ["KeyK", "KeyE"],
  ult: ["KeyL", "KeyQ"],
  jump: ["Space"],
  shield: ["ShiftLeft", "ShiftRight"],
};

/** An unchanged pad still goes out this often, as the gamepad kit's phone does, so the host never goes stale. */
const KEEPALIVE_MS = 250;

const PRESSES: Partial<Record<KeyButton, ButtonName>> = { attack: BUTTONS.attack, special: BUTTONS.special, ult: BUTTONS.ult };

function readState(payload: unknown): PhoneState | null {
  const parsed = phoneStateSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

/** The phone shows its controller only to a fighter in the match, from the countdown on. */
export function fighting(state: PhoneState | null): state is PhoneState {
  return !!state?.playing && (state.phase === "countdown" || state.phase === "fight" || state.phase === "game");
}

/**
 * Brawl Battle on the keyboard. The direction keys are the stick, like a
 * d-pad, so up and right is a full push both ways. Up past the flick line
 * also goes as the reliable Up press, as on the phone, and Space presses
 * Up alone, a jump that leaves the move's direction neutral. Attack and
 * Special go down and up with their keys, so holding one charges it.
 */
export class BrawlKeys implements KeyboardPlayer {
  private readonly stick = new StickKeys();
  private readonly buttons = new ButtonKeys(KEYS, { press: (key) => this.press(key), release: (key) => this.letGo(key) });
  /** Pad buttons held now, as the host has heard them. */
  private readonly held = new Set<ButtonName>();
  /** The last pad streamed and when, so an unchanged one waits for the keepalive as on the phone. */
  private lastPad = "";
  private lastPadAt = -Infinity;

  constructor(
    private readonly ctx: KeyboardContext,
    private readonly now: () => number = () => performance.now(),
  ) {}

  key(code: string, down: boolean): boolean {
    const used = this.stick.key(code, down) || this.buttons.key(code, down);
    if (used) this.syncUp();
    return used;
  }

  tick(): void {
    const state = readState(this.ctx.last("state"));
    if (!fighting(state)) {
      // The controller left the screen: the phone lets go of everything.
      for (const button of [...this.held]) this.padPress(button, false);
      this.lastPad = "";
      return;
    }
    // The Ult button turns off once the meter is spent, which lets it go.
    if (this.held.has(BUTTONS.ult) && state.ult < 1) this.padPress(BUTTONS.ult, false);
    const pad = { kind: "pad", ...this.axes(), held: [...this.held] };
    const key = JSON.stringify(pad);
    const now = this.now();
    // Every stream message costs the relay a command, so an idle pad only keeps alive.
    if (key === this.lastPad && now - this.lastPadAt < KEEPALIVE_MS) return;
    this.lastPad = key;
    this.lastPadAt = now;
    this.ctx.sendLossy(pad);
  }

  release(): void {
    this.stick.release();
    this.buttons.release();
    this.syncUp();
  }

  /** The stick as a d-pad: each axis full on or off. Shield holds it down. */
  axes(): { x: number; y: number } {
    const v = this.stick.vector();
    const y = this.buttons.isHeld("shield") ? -1 : Math.sign(v.y);
    return { x: Math.sign(v.x), y };
  }

  private press(key: KeyButton): void {
    const button = PRESSES[key];
    const state = readState(this.ctx.last("state"));
    if (!button || !fighting(state)) return;
    if (button === BUTTONS.ult && state.ult < 1) return;
    this.padPress(button, true);
  }

  private letGo(key: KeyButton): void {
    const button = PRESSES[key];
    if (button) this.padPress(button, false);
  }

  /** Up is held while the stick is pushed up past the flick line, or Space is down. */
  private syncUp(): void {
    const up = fighting(readState(this.ctx.last("state"))) && (this.axes().y >= MOVEMENT.flick || this.buttons.isHeld("jump"));
    if (up !== this.held.has(BUTTONS.up)) this.padPress(BUTTONS.up, up);
  }

  private padPress(button: ButtonName, down: boolean): void {
    if (down === this.held.has(button)) return;
    if (down) this.held.add(button);
    else this.held.delete(button);
    this.ctx.send({ kind: "pad-press", button, down, ...this.axes() });
  }
}

export const keyboard: KeyboardBinding = {
  controls: [
    {
      title: "Fight",
      rows: [
        { action: "Move", keys: [["A", "D"], ["Left", "Right"]] },
        { action: "Jump, again in the air to double jump", keys: ["Space", "W", "Up"] },
        { action: "Aim a move up or down", keys: [["W", "S"], ["Up", "Down"]] },
        { action: "Attack (hold to charge)", keys: ["J", "F"] },
        { action: "Special (hold to charge)", keys: ["K", "E"] },
        { action: "Ult, when full", keys: ["L", "Q"] },
        { action: "Shield, fall faster, drop through", keys: ["S", "Down", "Shift"] },
      ],
    },
  ],
  replaces: ["pad"],
  create: (ctx) => new BrawlKeys(ctx),
};
