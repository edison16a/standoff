import { KeyState, type KeyInput } from "./key-state";
import type { KeyboardBinding, KeyboardContext, KeyboardPlayer, StagePointer } from "./types";

/** How often a binding's tick runs, near the rate phones stream a stick. */
export const TICK_MS = 1000 / 30;

export interface RuntimeTimers {
  every(ms: number, run: () => void): () => void;
}

const realTimers: RuntimeTimers = {
  every(ms, run) {
    const id = setInterval(run, ms);
    return () => clearInterval(id);
  },
};

/**
 * Runs one game's binding for the keyboard seat. Keys reach the binding
 * once per press whatever the browser repeats, a lost focus lets go of
 * everything, and the tick runs on a timer so it carries on even while
 * the phone panel is folded away.
 */
export class KeyboardRuntime {
  private readonly keys = new KeyState();
  /** Held keys the binding used, so their repeats stay blocked too. */
  private readonly claimed = new Set<string>();
  private readonly player: KeyboardPlayer | null;
  private readonly stopTick: () => void;

  constructor(binding: KeyboardBinding | undefined, ctx: KeyboardContext, timers: RuntimeTimers = realTimers) {
    this.player = binding ? binding.create(ctx) : null;
    const tick = this.player?.tick?.bind(this.player);
    this.stopTick = tick ? timers.every(TICK_MS, tick) : () => undefined;
  }

  /** A key event. True when the binding used it, so the page can stop the browser's own action. */
  key(input: KeyInput): boolean {
    const player = this.player;
    if (!player?.key) return false;
    if (!this.keys.apply(input)) return this.claimed.has(input.code);
    const used = player.key(input.code, input.down) === true;
    if (input.down) {
      if (used) this.claimed.add(input.code);
      return used;
    }
    // A key up belongs to whoever took its key down.
    return this.claimed.delete(input.code) || used;
  }

  pointer(event: StagePointer): void {
    this.player?.pointer?.(event);
  }

  /** Every key let go, each with its key up first so helpers see a clean release. */
  release(): void {
    const player = this.player;
    for (const code of this.keys.releaseAll()) player?.key?.(code, false);
    this.claimed.clear();
    player?.release?.();
  }

  dispose(): void {
    this.release();
    this.stopTick();
    this.player?.dispose?.();
  }
}
