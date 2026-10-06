import { defenseOf, type Shell } from "../engine/stance";
import type { DefenseInput, Hand, Level } from "../engine/types";

/** What a key press asks for, by screen: a punch in the fight, browsing or locking in on the build choice. */
export type KeyAction = { type: "punch"; hand: Hand; straight: boolean; level: Level } | { type: "browse"; direction: -1 | 1 } | { type: "lock" };

type Hold = "slipLeft" | "slipRight" | "duck" | "guard" | "body" | "earLeft" | "earRight" | "touch";
type Punch = "jab" | "cross" | "hookLeft" | "hookRight";

/** Keys by where they sit on the keyboard, so every layout plays the same. */
const HOLDS: Record<string, Hold> = {
  KeyA: "slipLeft",
  ArrowLeft: "slipLeft",
  KeyD: "slipRight",
  ArrowRight: "slipRight",
  KeyS: "duck",
  ArrowDown: "duck",
  Space: "guard",
  ShiftLeft: "body",
  ShiftRight: "body",
  KeyQ: "earLeft",
  KeyE: "earRight",
  KeyF: "touch",
};

const PUNCHES: Record<string, Punch> = { KeyJ: "jab", KeyK: "cross", KeyU: "hookLeft", KeyI: "hookRight" };

const PUNCH_SHAPES: Record<Punch, { hand: Hand; straight: boolean }> = {
  jab: { hand: "left", straight: true },
  cross: { hand: "right", straight: true },
  hookLeft: { hand: "left", straight: false },
  hookRight: { hand: "right", straight: false },
};

/** Every key the keyboard mode reads, so the page can keep the browser's own use of them. */
export function isBoxingKey(code: string): boolean {
  return code in HOLDS || code in PUNCHES;
}

/**
 * Boxing's keyboard mode, for playing without the camera. Held keys
 * shape the defence the camera would read off a body: the head slips
 * and ducks, the gloves cover the face, an ear or the ribs, and both go
 * out to touch. Punch keys throw on the way down. Ducking while punching
 * digs to the body, as dipping the knees does in front of the camera.
 * Pure, so tests press keys.
 */
export class BoxingKeys {
  private readonly held = new Set<Hold>();

  /** A key went down or up. Returns what a fresh press asks for, or null. */
  press(code: string, down: boolean, repeat = false): KeyAction | null {
    const hold = HOLDS[code];
    if (hold) {
      if (down) this.held.add(hold);
      else this.held.delete(hold);
    }
    if (!down || repeat) return null;
    const punch = PUNCHES[code];
    if (punch) return { type: "punch", ...PUNCH_SHAPES[punch], level: this.held.has("duck") ? "body" : "head" };
    if (hold === "slipLeft" || hold === "slipRight") return { type: "browse", direction: hold === "slipLeft" ? -1 : 1 };
    if (hold === "guard") return { type: "lock" };
    return null;
  }

  /** The defence the held keys make, in the shape the camera gives. */
  defense(): DefenseInput {
    const has = (hold: Hold) => this.held.has(hold);
    const ear = has("earLeft") ? "left" : has("earRight") ? "right" : undefined;
    const shell: Shell = ear ? "high" : has("body") ? "body" : has("guard") ? "guard" : "loose";
    const slip = (has("slipRight") ? 1 : 0) - (has("slipLeft") ? 1 : 0);
    // Both gloves up gets a boxer off the canvas, as a guard does on camera.
    const raise = shell === "guard" || shell === "high";
    return defenseOf({ shell, side: ear, duck: has("duck") ? 1 : 0, slip, raise, reach: has("touch") });
  }

  /** Every key let go at once, as when the window loses focus. */
  release(): void {
    this.held.clear();
  }
}
