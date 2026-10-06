import { defenseOf, type Shell } from "../engine/stance";
import type { DefenseInput, Hand, Level } from "../engine/types";

/** Everything a boxer does in keyboard mode. Holds move the head and the gloves; punches are taps. */
export const BOX_KEYS = ["slip-left", "slip-right", "duck", "jab", "cross", "hook-left", "hook-right", "guard", "high", "body", "touch"] as const;
export type BoxKey = (typeof BOX_KEYS)[number];

/** The keys of keyboard mode, by `event.code`, so every keyboard layout plays the same. */
export const KEYS: Readonly<Record<string, BoxKey>> = {
  KeyA: "slip-left",
  ArrowLeft: "slip-left",
  KeyD: "slip-right",
  ArrowRight: "slip-right",
  KeyS: "duck",
  ArrowDown: "duck",
  KeyJ: "jab",
  KeyK: "cross",
  KeyU: "hook-left",
  KeyI: "hook-right",
  Space: "guard",
  ShiftLeft: "high",
  ShiftRight: "high",
  KeyF: "body",
  KeyE: "touch",
};

/** A punch thrown from the keys, for the fight driver. */
export interface KeyPunch {
  hand: Hand;
  straight: boolean;
  level: Level;
}

const PUNCHES: Partial<Record<BoxKey, Omit<KeyPunch, "level">>> = {
  jab: { hand: "left", straight: true },
  cross: { hand: "right", straight: true },
  "hook-left": { hand: "left", straight: false },
  "hook-right": { hand: "right", straight: false },
};

/** How hard a key punch is, 0 to 1: a firm punch, inside what the computer boxer throws. */
export const KEY_POWER = 0.7;
/** The head eases to where the keys put it, about as quick as a real slip, so a late dodge still works. */
const HEAD_EASE_MS = 60;
const MAX_STEP_MS = 250;

/**
 * Keyboard mode for one boxer, the same input the camera gives. A and D
 * slip the head, S ducks it, and a punch thrown while ducking digs to the
 * body, as dipping the knees does in front of the camera. Space is the
 * guard, Shift pins both gloves up by the ears against hooks, F tucks the
 * elbows against body shots, and E holds both gloves out to touch. The
 * guard is also both gloves raised, which gets a boxer up from a
 * knockdown. Pure, so tests press keys and read the defence.
 */
export class KeyBoxer {
  private readonly held = new Set<BoxKey>();
  private readonly head = { x: 0, y: 0 };
  private last: number | null = null;

  /** A key went down or up. Returns the punch a key down throws, or null. */
  press(key: BoxKey, down: boolean): KeyPunch | null {
    if (!down) {
      this.held.delete(key);
      return null;
    }
    this.held.add(key);
    const punch = PUNCHES[key];
    return punch ? { ...punch, level: this.held.has("duck") ? "body" : "head" } : null;
  }

  isHeld(key: BoxKey): boolean {
    return this.held.has(key);
  }

  /** Every key let go, as when the window loses focus. */
  release(): void {
    this.held.clear();
  }

  /** A new fight: standing tall with nothing held. */
  reset(): void {
    this.held.clear();
    this.head.x = this.head.y = 0;
    this.last = null;
  }

  /** The defence this frame, with the head eased toward where the keys want it. */
  defense(now: number): DefenseInput {
    const dt = this.last === null ? MAX_STEP_MS : Math.min(MAX_STEP_MS, Math.max(0, now - this.last));
    this.last = now;
    const slip = (this.held.has("slip-right") ? 1 : 0) - (this.held.has("slip-left") ? 1 : 0);
    const target = defenseOf({ slip, duck: this.held.has("duck") ? 1 : 0 }).head;
    const k = 1 - Math.exp(-dt / HEAD_EASE_MS);
    this.head.x += (target.x - this.head.x) * k;
    this.head.y += (target.y - this.head.y) * k;
    const input = defenseOf({ shell: this.shell(), side: "left", raise: this.held.has("guard") || this.held.has("high"), reach: this.held.has("touch") });
    // A high shell pins one glove in the engine's words. Both gloves by the ears is a real pose, so both get it.
    if (this.shell() === "high") input.cover.right = { ...input.cover.left };
    input.head = { ...this.head };
    return input;
  }

  private shell(): Shell {
    if (this.held.has("high")) return "high";
    if (this.held.has("body")) return "body";
    if (this.held.has("guard")) return "guard";
    return "loose";
  }
}
