/** A stick reading: x right and y up, with length at most 1. The same shape as the gamepad kit's. */
export interface StickVector {
  x: number;
  y: number;
}

type Direction = "up" | "down" | "left" | "right";

const WASD: Record<string, Direction> = { KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right" };
const ARROWS: Record<string, Direction> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };

/** Which keys move the stick: W A S D, the arrow keys, or both (the default). */
export type StickLayout = "wasd" | "arrows" | "both";

function layoutKeys(layout: StickLayout): Record<string, Direction> {
  if (layout === "wasd") return WASD;
  if (layout === "arrows") return ARROWS;
  return { ...WASD, ...ARROWS };
}

/**
 * Turns opposite held directions into one axis: both or neither is zero.
 * A diagonal is scaled to length 1, so running diagonally is no faster.
 */
export function stickVector(up: boolean, down: boolean, left: boolean, right: boolean): StickVector {
  const x = (right ? 1 : 0) - (left ? 1 : 0);
  const y = (up ? 1 : 0) - (down ? 1 : 0);
  if (x !== 0 && y !== 0) return { x: x * Math.SQRT1_2, y: y * Math.SQRT1_2 };
  return { x, y };
}

/**
 * Direction keys as a thumb stick. W and Up arrow can both be held, and
 * the direction stays held until the last of them is let go.
 */
export class StickKeys {
  private readonly keys: Record<string, Direction>;
  private readonly held = new Set<string>();

  constructor(layout: StickLayout = "both") {
    this.keys = layoutKeys(layout);
  }

  /** Feed every key here. True when it was one of the stick's keys. */
  key(code: string, down: boolean): boolean {
    if (!(code in this.keys)) return false;
    if (down) this.held.add(code);
    else this.held.delete(code);
    return true;
  }

  vector(): StickVector {
    const on = (direction: Direction) => [...this.held].some((code) => this.keys[code] === direction);
    return stickVector(on("up"), on("down"), on("left"), on("right"));
  }

  /** True while any direction is held. */
  get active(): boolean {
    return this.held.size > 0;
  }

  release(): void {
    this.held.clear();
  }
}
