import { defenseOf } from "../../engine/stance";
import type { DefenseInput, Hand, Level } from "../../engine/types";

/** Everything a key can do in a fight. */
export type BoxAction = "slipLeft" | "slipRight" | "duck" | "dodge" | "block" | "blockBody" | "touch" | "jab" | "cross" | "hook" | "uppercut";

/** Keyboard mode's keys, by where they sit (`event.code`), so every layout plays the same. */
export const BOX_KEYS: Readonly<Record<string, BoxAction>> = {
  KeyA: "slipLeft",
  ArrowLeft: "slipLeft",
  KeyD: "slipRight",
  ArrowRight: "slipRight",
  KeyS: "duck",
  ArrowDown: "duck",
  Space: "dodge",
  ShiftLeft: "block",
  ShiftRight: "block",
  KeyF: "blockBody",
  KeyE: "touch",
  KeyJ: "jab",
  KeyK: "cross",
  KeyL: "hook",
  KeyI: "uppercut",
};

/** A punch as the fight driver takes it from the camera. */
export interface KeyPunch {
  hand: Hand;
  straight: boolean;
  level: Level;
  /** 0 to 1, as the camera reads how hard a punch was thrown. */
  power: number;
}

/**
 * Every boxer is orthodox, so the jab is the left straight, the cross the
 * right. The match knows no uppercut, so the key throws its nearest
 * thing: the rear hand dug up into the body, a body uppercut.
 */
export const KEY_PUNCHES: Readonly<Record<"jab" | "cross" | "hook" | "uppercut", KeyPunch>> = {
  jab: { hand: "left", straight: true, level: "head", power: 0.7 },
  cross: { hand: "right", straight: true, level: "head", power: 0.9 },
  hook: { hand: "left", straight: false, level: "head", power: 0.9 },
  uppercut: { hand: "right", straight: true, level: "body", power: 1 },
};

/** A tap of the dodge key bobs under for this long, long enough to let a hook sweep over. */
export const BOB_MS = 420;
/** How quickly the head eases to where the keys put it, per second. A head never teleports. */
const HEAD_RATE = 22;

function isPunch(action: BoxAction): action is keyof typeof KEY_PUNCHES {
  return action in KEY_PUNCHES;
}

/**
 * Keys as a boxer's upper body: the same defence input the camera gives,
 * and punches as the camera reports them. Holds stay on until their key
 * comes up. Pure, so tests press keys with their own clock.
 */
export class KeyBoxer {
  private readonly held = new Set<BoxAction>();
  private bobUntil = -Infinity;
  private duck = 0;
  private slip = 0;
  private easedAt: number | null = null;

  /** A key went down or up. Returns the punch a key down throws, if it is a punch key. */
  press(action: BoxAction, down: boolean, now: number): KeyPunch | null {
    if (!down) {
      this.held.delete(action);
      return null;
    }
    if (isPunch(action)) return KEY_PUNCHES[action];
    this.held.add(action);
    if (action === "dodge") this.bobUntil = now + BOB_MS;
    return null;
  }

  /** This frame's defence. Raising the guard is also how a boxer who is down gets up. */
  defense(now: number): DefenseInput {
    const on = (action: BoxAction) => this.held.has(action);
    const duckTo = on("duck") || now < this.bobUntil ? 1 : 0;
    const slipTo = (on("slipRight") ? 1 : 0) - (on("slipLeft") ? 1 : 0);
    const dt = this.easedAt === null ? 1 : Math.min(0.1, Math.max(0, (now - this.easedAt) / 1000));
    const k = this.easedAt === null ? 1 : 1 - Math.exp(-HEAD_RATE * dt);
    this.easedAt = now;
    this.duck += (duckTo - this.duck) * k;
    this.slip += (slipTo - this.slip) * k;
    const shell = on("blockBody") ? "body" : on("block") ? "guard" : "loose";
    return defenseOf({ shell, duck: this.duck, slip: this.slip, raise: on("block"), reach: on("touch") });
  }

  /** Every key let go, as when the window loses focus and the key ups never come. */
  release(): void {
    this.held.clear();
    this.bobUntil = -Infinity;
  }
}
