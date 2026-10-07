/**
 * The facing a figure is drawn with. The engine may turn a man in one
 * step: a lunge squares to its line, a beaten blocker wheels round to
 * chase, a tackle preset faces a carrier into the hit. Drawn as is,
 * that pops the whole body round in a frame, so the drawn facing
 * follows the engine's the short way round, fast enough that a juke's
 * spin still keeps up, and snaps only when the man is moved somewhere
 * new, like the next play lining up.
 */
export const FACING = {
  /** How quickly the drawn facing closes on the engine's, per second. */
  rate: 24,
  /** A move this far in one frame is a teleport, not a run, and the facing snaps with it. */
  snap: 1.5,
};

const TURN = Math.PI * 2;

/** The angle from `from` to `to`, the short way round. */
export function shortWay(from: number, to: number): number {
  return ((((to - from + Math.PI) % TURN) + TURN) % TURN) - Math.PI;
}

export class Facing {
  private yaw = NaN;
  private x = 0;
  private z = 0;

  /** The facing to draw this frame for a man at `x`, `z` facing `yaw` in the engine. */
  update(yaw: number, x: number, z: number, dt: number): number {
    const moved = Math.hypot(x - this.x, z - this.z);
    this.x = x;
    this.z = z;
    if (!Number.isFinite(this.yaw) || moved > FACING.snap) this.yaw = yaw;
    else this.yaw += shortWay(this.yaw, yaw) * (1 - Math.exp(-dt * FACING.rate));
    return this.yaw;
  }
}
