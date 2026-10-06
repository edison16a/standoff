import { BUILDS } from "../../engine/builds";
import type { DefenseInput } from "../../engine/types";
import type { BoxingHost } from "../boxing-host";
import { useBoxingStore, type Screen } from "../host-store";
import { BOX_KEYS, KeyBoxer, type KeyPunch } from "./key-boxer";

export interface KeyPlayHandlers {
  /** Where the flow is, since the same keys browse on the pick screen and box in the fight. */
  screen(): Screen;
  punch(punch: KeyPunch): void;
  /** On the pick screen: -1 or 1 to browse the builds. */
  browse(direction: -1 | 1): void;
  /** On the pick screen: lock the build in. */
  lock(): void;
}

/** Browsing and locking in on the pick screen. */
const PICK_KEYS: Readonly<Record<string, -1 | 1 | "lock">> = { KeyA: -1, ArrowLeft: -1, KeyD: 1, ArrowRight: 1, Enter: "lock", Space: "lock" };

/**
 * Boxing's keyboard mode, for playing or testing with no camera: the
 * page's keys go to a `KeyBoxer` in the fight and browse the builds on the
 * pick screen. The mouse still works on every menu.
 */
export class KeyPlay {
  private readonly boxer = new KeyBoxer();
  private readonly unlisten: () => void;

  constructor(private readonly handlers: KeyPlayHandlers) {
    const down = (event: KeyboardEvent) => this.onKey(event, true);
    const up = (event: KeyboardEvent) => this.onKey(event, false);
    // A key let go while the window is in the background never says so, so a held block would stick.
    const blur = () => this.boxer.release();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    this.unlisten = () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }

  defense(now: number): DefenseInput {
    return this.boxer.defense(now);
  }

  dispose(): void {
    this.unlisten();
    this.boxer.release();
  }

  private onKey(event: KeyboardEvent, down: boolean): void {
    const target = event.target as Element | null;
    // Typing in a field, or a shortcut like Ctrl+R, is not a move.
    if (target?.closest?.("input, textarea, select") || event.ctrlKey || event.metaKey || event.altKey) return;
    const screen = this.handlers.screen();
    if (screen === "pick") return this.onPick(event, down);
    const action = BOX_KEYS[event.code];
    // A key up always counts, so a guard held into the results never comes back up into the next fight.
    if (!action || (down && screen !== "fight")) return;
    // Space would otherwise press whichever button has focus, and the arrows scroll.
    event.preventDefault();
    if (event.repeat) return;
    const punch = this.boxer.press(action, down, performance.now());
    if (punch) this.handlers.punch(punch);
  }

  private onPick(event: KeyboardEvent, down: boolean): void {
    const pick = PICK_KEYS[event.code];
    if (pick === undefined) return;
    event.preventDefault();
    if (!down || event.repeat) return;
    if (pick === "lock") this.handlers.lock();
    else this.handlers.browse(pick);
  }
}

/** Keyboard mode wired to the session: the player's keys drive camera slot 1, red corner. */
export function keysFor(host: Pick<BoxingHost, "driver" | "pick" | "choose" | "lock">): KeyPlay {
  return new KeyPlay({
    screen: () => useBoxingStore.getState().screen,
    punch: (p) => host.driver?.punch(1, p.hand, p.straight, p.power, p.level),
    browse(direction) {
      const count = BUILDS.length;
      if (host.pick) host.choose(0, (host.pick.state.picks[0] + direction + count) % count);
    },
    lock: () => host.lock(0),
  });
}
