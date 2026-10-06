import type { DefenseInput } from "../engine/types";
import type { FightDriver } from "./fight-driver";
import type { Screen } from "./host-store";
import { BoxingKeys, isBoxingKey, type KeyAction } from "./key-input";
import type { PickControl } from "./pick-control";

/** A key punch carries a firm, middling power: the camera reads anything from a flick to a full swing. */
const KEY_POWER = 0.7;

/**
 * Acts on a fresh key press for the screen it lands on: a punch in the
 * fight, browsing or locking in a build on the build choice. Returns true
 * when the build choice changed, for the host to show and tick.
 */
export function applyKey(action: KeyAction, screen: Screen, driver: FightDriver | null, pick: PickControl | null): boolean {
  if (screen === "fight" && action.type === "punch") driver?.punch(1, action.hand, action.straight, KEY_POWER, action.level);
  if (screen !== "pick" || !pick || pick.state.locked[0] || action.type === "punch") return false;
  if (action.type === "browse") pick.step(0, action.direction);
  else pick.lock(0);
  return true;
}

/**
 * The keyboard mode's ears on the page: keys from the host window go to
 * `BoxingKeys`, fresh presses go out to the host, and a lost focus lets
 * go of everything so a held block or duck never sticks.
 */
export class KeyControls {
  private readonly keys = new BoxingKeys();
  private readonly unlisten: () => void;

  constructor(onAction: (action: KeyAction) => void) {
    const onKey = (event: KeyboardEvent) => {
      if (!isBoxingKey(event.code) || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      // Space would otherwise press whichever button has focus.
      event.preventDefault();
      const action = this.keys.press(event.code, event.type === "keydown", event.repeat);
      if (action) onAction(action);
    };
    const blur = () => this.keys.release();
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", blur);
    this.unlisten = () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", blur);
    };
  }

  defense(): DefenseInput {
    return this.keys.defense();
  }

  dispose(): void {
    this.unlisten();
    this.keys.release();
  }
}
