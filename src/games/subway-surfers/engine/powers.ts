import type { PowerKind } from "./types";

/** How long each power up lasts, in seconds. The hoverboard also ends when it saves you. */
export const POWER_SECONDS: Record<PowerKind, number> = {
  boots: 12,
  hoverboard: 25,
  magnet: 12,
  double: 15,
  jetpack: 7,
};

export const POWER_NAMES: Record<PowerKind, string> = {
  boots: "Jump boots",
  hoverboard: "Hoverboard",
  magnet: "Coin magnet",
  double: "Double score",
  jetpack: "Jetpack",
};

/** The jetpack's cruising height, above every train and under the tunnel roofs. */
export const JETPACK_HEIGHT = 7.2;

/** The magnet pulls coins in from every lane, from just behind to this far ahead. */
export const MAGNET_AHEAD = 14;

/** Active power ups and the seconds each has left. */
export class Powers {
  private readonly left = new Map<PowerKind, number>();

  has(kind: PowerKind): boolean {
    return (this.left.get(kind) ?? 0) > 0;
  }

  /** Seconds left, 0 when off. */
  remaining(kind: PowerKind): number {
    return this.left.get(kind) ?? 0;
  }

  /** Share of the time left, 1 when fresh, for the timers on screen. */
  share(kind: PowerKind): number {
    return this.remaining(kind) / POWER_SECONDS[kind];
  }

  start(kind: PowerKind): void {
    this.left.set(kind, POWER_SECONDS[kind]);
  }

  end(kind: PowerKind): void {
    this.left.delete(kind);
  }

  /** Counts every timer down. Returns the ones that ran out. */
  tick(dt: number): PowerKind[] {
    const ended: PowerKind[] = [];
    for (const [kind, seconds] of this.left) {
      const next = seconds - dt;
      if (next <= 0) {
        this.left.delete(kind);
        ended.push(kind);
      } else this.left.set(kind, next);
    }
    return ended;
  }

  active(): PowerKind[] {
    return [...this.left.keys()];
  }
}
