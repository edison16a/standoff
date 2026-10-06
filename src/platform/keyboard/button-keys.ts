/** Each button and the keys that press it, by `event.code`: { shoot: ["Space", "KeyJ"] }. */
export type ButtonMap<B extends string> = Readonly<Record<B, readonly string[]>>;

export interface ButtonHandlers<B extends string> {
  /** The button went down. A tap button only needs this. */
  press?(button: B): void;
  /** The button came back up, with how long it was held, for hold and charge buttons. */
  release?(button: B, heldMs: number): void;
}

/**
 * Keys as buttons. Several keys can press one button, and it stays down
 * until the last of them is let go, so each button gets exactly one press
 * and one release however the keys overlap.
 */
export class ButtonKeys<B extends string> {
  private readonly byCode = new Map<string, B>();
  private readonly codes = new Map<B, Set<string>>();
  private readonly since = new Map<B, number>();

  constructor(
    map: ButtonMap<B>,
    private readonly handlers: ButtonHandlers<B> = {},
    private readonly now: () => number = () => performance.now(),
  ) {
    for (const button of Object.keys(map) as B[]) for (const code of map[button]) this.byCode.set(code, button);
  }

  /** Feed every key here. True when it was one of the buttons' keys. */
  key(code: string, down: boolean): boolean {
    const button = this.byCode.get(code);
    if (button === undefined) return false;
    const codes = this.codes.get(button) ?? new Set<string>();
    if (down) {
      const first = codes.size === 0;
      codes.add(code);
      this.codes.set(button, codes);
      if (first) {
        this.since.set(button, this.now());
        this.handlers.press?.(button);
      }
      return true;
    }
    if (codes.delete(code) && codes.size === 0) this.up(button);
    return true;
  }

  isHeld(button: B): boolean {
    return (this.codes.get(button)?.size ?? 0) > 0;
  }

  /** Every button down right now, for a stream such as the gamepad kit's `held`. */
  held(): B[] {
    return [...this.codes].filter(([, codes]) => codes.size > 0).map(([button]) => button);
  }

  /** Lets go of every button, each with its release. */
  release(): void {
    for (const button of this.held()) {
      this.codes.get(button)?.clear();
      this.up(button);
    }
  }

  private up(button: B): void {
    const start = this.since.get(button) ?? this.now();
    this.since.delete(button);
    this.handlers.release?.(button, Math.max(0, this.now() - start));
  }
}
