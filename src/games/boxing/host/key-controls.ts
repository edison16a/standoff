import { KEYS, type BoxKey } from "./key-boxer";

/**
 * Keyboard mode's keys, from this page or from the admin panel's
 * Keyboard player. The Keyboard player takes the keys on this page first
 * (it marks them handled) and sends them through the room to `remote`,
 * so each press counts once. A key held on two caps, A and Left, stays
 * down until the last is let go. Keys only count while `active` says
 * keyboard mode is on, so the camera game never fights the keys.
 */
export class KeyControls {
  private readonly codes = new Map<BoxKey, Set<string>>();
  private readonly unlisten: () => void;

  constructor(
    private readonly active: () => boolean,
    private readonly onKey: (key: BoxKey, down: boolean) => void,
    private readonly onRelease: () => void,
  ) {
    const key = (event: KeyboardEvent) => this.onPageKey(event);
    const blur = () => this.release();
    window.addEventListener("keydown", key);
    window.addEventListener("keyup", key);
    window.addEventListener("blur", blur);
    this.unlisten = () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("keyup", key);
      window.removeEventListener("blur", blur);
    };
  }

  /** A key from the Keyboard player, already one press per button. */
  remote(key: BoxKey, down: boolean): void {
    if (this.active()) this.onKey(key, down);
  }

  /** Every held key let go, as when the window loses focus and its key up never comes. */
  release(): void {
    this.codes.clear();
    this.onRelease();
  }

  dispose(): void {
    this.unlisten();
  }

  private onPageKey(event: KeyboardEvent): void {
    const key = KEYS[event.code];
    const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
    if (!key || !this.active() || event.defaultPrevented || typing || event.ctrlKey || event.metaKey || event.altKey) return;
    // Space would press the focused button, and the arrows would scroll.
    event.preventDefault();
    const down = event.type === "keydown";
    if (down && event.repeat) return;
    const codes = this.codes.get(key) ?? new Set<string>();
    this.codes.set(key, codes);
    const was = codes.size > 0;
    if (down) codes.add(event.code);
    else codes.delete(event.code);
    const now = codes.size > 0;
    if (was !== now) this.onKey(key, now);
  }
}
