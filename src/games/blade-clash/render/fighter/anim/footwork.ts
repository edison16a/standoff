import { BODY } from "../rig/skeleton";

/** Where each foot rests against the body in a fighting stance: sword foot forward, the other back and turned out. */
export const STANCE = {
  R: { f: 0.2, r: 0.13, toe: 0.05 },
  L: { f: -0.22, r: -0.14, toe: 0.55 },
} as const;
/** Walking narrows the stance, so the trailing foot never has to reach further than the leg is long. */
const WALK_NARROW = 0.45;

interface Step {
  from: number;
  to: number;
  /** 0 to 1 through the step. */
  p: number;
  duration: number;
  height: number;
}

interface Foot {
  /** Place along the fighting line, in the world. */
  x: number;
  step: Step | null;
}

export type Side = "R" | "L";

/**
 * Planted feet that step. Each foot stays exactly where it was put on
 * the floor until the body has moved far enough from it, then lifts and
 * steps ahead of the body. One foot steps at a time, so walking forward
 * is a quick advance of the front foot and a follow of the back one, the
 * way a swordsman moves, and the feet never slide.
 */
export class Footwork {
  private readonly feet: Record<Side, Foot> = { R: { x: 0, step: null }, L: { x: 0, step: null } };
  private stillFor = 0;

  /** Puts both feet straight into the stance at `x`, as when a fighter appears or a bout starts. */
  reset(x: number, facing: 1 | -1): void {
    for (const side of ["R", "L"] as const) this.feet[side] = { x: x + facing * STANCE[side].f, step: null };
    this.stillFor = 0;
  }

  /** Moves the feet on. `speed` is metres a second along `facing`, `dt` seconds. */
  update(x: number, facing: 1 | -1, speed: number, dt: number): void {
    const moving = Math.abs(speed) > 0.05;
    this.stillFor = moving ? 0 : this.stillFor + dt;
    const narrow = 1 - WALK_NARROW * Math.min(1, Math.abs(speed) / 1.2);
    for (const side of ["R", "L"] as const) this.advance(this.feet[side], dt);
    if (this.feet.R.step || this.feet.L.step) return;

    const want = (side: Side) => x + facing * STANCE[side].f * narrow;
    const error = (side: Side) => want(side) - this.feet[side].x;
    // The foot furthest behind steps first; on a tie, the one leading the way the body moves.
    const lead: Side = speed >= 0 ? "R" : "L";
    const other: Side = lead === "R" ? "L" : "R";
    const side = Math.abs(error(other)) > Math.abs(error(lead)) + 0.02 ? other : lead;
    const off = Math.abs(error(side));
    // Walking steps early and often. Standing, a foot only shuffles back into place once the body has settled.
    const threshold = moving ? 0.06 : this.stillFor > 0.25 ? 0.035 : 0.14;
    if (off < threshold) return;
    const duration = moving ? Math.max(0.12, 0.2 - 0.04 * Math.abs(speed)) : 0.18;
    const ahead = facing * speed * duration * 0.7;
    this.feet[side].step = { from: this.feet[side].x, to: want(side) + ahead, p: 0, duration, height: moving ? 0.05 + 0.02 * Math.min(1, Math.abs(speed)) : 0.03 };
  }

  /** A foot's ankle in the fighter's own space. */
  ankle(side: Side, x: number, facing: 1 | -1): { f: number; u: number; r: number } {
    const foot = this.feet[side];
    const lift = foot.step ? Math.sin(Math.PI * foot.step.p) * foot.step.height : 0;
    return { f: (foot.x - x) * facing, u: BODY.ankle + lift, r: STANCE[side].r };
  }

  /** How far through a step the body is, for the bob of the hips: 1 mid stride, 0 planted. */
  get stride(): number {
    const step = this.feet.R.step ?? this.feet.L.step;
    return step ? Math.sin(Math.PI * step.p) : 0;
  }

  private advance(foot: Foot, dt: number): void {
    const step = foot.step;
    if (!step) return;
    step.p = Math.min(1, step.p + dt / step.duration);
    const k = step.p * step.p * (3 - 2 * step.p);
    foot.x = step.from + (step.to - step.from) * k;
    if (step.p >= 1) foot.step = null;
  }
}
