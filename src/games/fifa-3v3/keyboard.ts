import { ButtonKeys, StickKeys, type KeyboardBinding, type KeyboardContext, type KeyboardPlayer } from "@/platform/keyboard";
import { BUTTONS } from "./protocol";
import { onPad, padButtonFor, padMode, readState, type KeyButton, type PadName } from "./keyboard-rules";

const KEYS: Record<KeyButton, readonly string[]> = {
  big: ["Space", "KeyJ"],
  guard: ["ShiftLeft", "ShiftRight"],
  slide: ["KeyE", "KeyK"],
  steal: ["KeyF", "KeyL"],
  jump: ["KeyQ"],
};

/** The phone caps a charge at ten seconds, and so does the host's schema. */
const MAX_HELD_MS = 10000;

/**
 * Soccer 3v3 on the keyboard: the keys stand in for the phone's thumb
 * stick and buttons, sending the gamepad kit's messages exactly as the
 * phone does. Shoot/Pass sends how long it was held just before its
 * release, so a tap passes and a hold shoots with that much power.
 */
export class FifaKeys implements KeyboardPlayer {
  private readonly stick = new StickKeys();
  private readonly buttons: ButtonKeys<KeyButton>;
  /** Each held key button, the pad button it pressed and when, for the shot's charge. */
  private readonly held = new Map<KeyButton, { pad: PadName; at: number }>();
  /** The pad layout last seen, so a change lets go of everything as the phone does. */
  private layout = "off";

  constructor(
    private readonly ctx: KeyboardContext,
    private readonly now: () => number = () => performance.now(),
  ) {
    this.buttons = new ButtonKeys(KEYS, { press: (key) => this.press(key), release: (key) => this.letKeyGo(key) });
  }

  key(code: string, down: boolean): boolean {
    return this.stick.key(code, down) || this.buttons.key(code, down);
  }

  tick(): void {
    const state = readState(this.ctx.last("state"));
    const layout = onPad(state) ? padMode(state) : "off";
    if (layout !== this.layout) {
      this.layout = layout;
      this.letGo();
    }
    // A button the phone turns off under a held thumb lets go by itself.
    for (const [key, { pad }] of this.held) if (padButtonFor(key, state) !== pad) this.letKeyGo(key);
    if (!onPad(state)) return;
    const { x, y } = this.stick.vector();
    this.ctx.sendLossy({ kind: "pad", x: round(x), y: round(y), held: this.pads() });
  }

  /** Focus lost: every key up, a held shot let go as a thumb lifting off would. */
  release(): void {
    this.stick.release();
    this.buttons.release();
  }

  /** A key up, or its button turned off: the shot goes with how long it was held, as the phone times it. */
  private letKeyGo(key: KeyButton): void {
    const entry = this.held.get(key);
    if (!entry) return;
    this.held.delete(key);
    const heldMs = Math.min(MAX_HELD_MS, Math.round(this.now() - entry.at));
    if (entry.pad === BUTTONS.shoot) this.ctx.send({ kind: "release", heldMs });
    this.padPress(entry.pad, false);
  }

  private press(key: KeyButton): void {
    const pad = padButtonFor(key, readState(this.ctx.last("state")));
    // Space and Shift both hold Guard; the pad hears it once.
    if (!pad || this.pads().includes(pad)) return;
    this.held.set(key, { pad, at: this.now() });
    this.padPress(pad, true);
  }

  /** A new layout of buttons: whatever was held is let go with no shot, as on the phone. */
  private letGo(): void {
    for (const pad of this.pads()) this.padPress(pad, false);
    this.held.clear();
  }

  private pads(): PadName[] {
    return [...this.held.values()].map((entry) => entry.pad);
  }

  private padPress(button: PadName, down: boolean): void {
    const { x, y } = this.stick.vector();
    this.ctx.send({ kind: "pad-press", button, down, x: round(x), y: round(y) });
  }
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export const keyboard: KeyboardBinding = {
  controls: [
    {
      title: "Match",
      rows: [
        { action: "Run", keys: [["W", "A", "S", "D"], ["Up", "Down", "Left", "Right"]] },
        { action: "Pass (tap) or shoot (hold)", keys: ["Space", "J"] },
        { action: "Slide, or skill with the ball", keys: ["E", "K"] },
        { action: "Steal", keys: ["F", "L"] },
      ],
    },
    {
      title: "Defending",
      rows: [
        { action: "Guard (hold)", keys: ["Shift", "Space"] },
        { action: "Jump to block", keys: ["Q"] },
      ],
    },
    {
      title: "Set pieces and replays",
      rows: [
        { action: "Set, then kick", keys: ["Space"] },
        { action: "Skip the replay", keys: ["Space"] },
      ],
    },
  ],
  replaces: ["pad"],
  create: (ctx) => new FifaKeys(ctx),
};
