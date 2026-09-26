/**
 * The fingers on a drag pad. The newest finger drives the aim, and when it
 * lifts the one still down takes over from where it is. Without this, a
 * second finger touching and lifting again left the first one dragging
 * with nothing happening.
 */
export class PadTracker {
  /** Fingers still down, oldest first, at the place each was last seen. */
  private readonly down = new Map<number, { x: number; y: number }>();

  press(id: number, x: number, y: number): void {
    // Deleted first so a finger that somehow presses again becomes the newest.
    this.down.delete(id);
    this.down.set(id, { x, y });
  }

  /** How far the driving finger moved since it was last seen, or null for any other finger. */
  move(id: number, x: number, y: number): { dx: number; dy: number } | null {
    const from = this.down.get(id);
    if (!from) return null;
    this.down.set(id, { x, y });
    if (id !== this.driver) return null;
    return { dx: x - from.x, dy: y - from.y };
  }

  lift(id: number): void {
    this.down.delete(id);
  }

  private get driver(): number | undefined {
    let last: number | undefined;
    for (const id of this.down.keys()) last = id;
    return last;
  }
}
