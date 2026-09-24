import type { Vec2 } from "./geometry";
import type { Seat } from "./events";
import { COMBO_MIN, COMBO_WINDOW_S } from "./tuning";

export interface ComboDone {
  seat: Seat;
  count: number;
  /** Where the last fruit of the run was cut, for the popup. */
  at: Vec2;
}

/**
 * Counts fruit cut in one swipe per player. Each cut keeps the run alive
 * for a short window. When the window closes a run of three or more
 * becomes a combo.
 */
export class Combos {
  private readonly runs = new Map<Seat, { count: number; timer: number; at: Vec2 }>();

  add(seat: Seat, at: Vec2): void {
    const run = this.runs.get(seat);
    if (run) {
      run.count += 1;
      run.timer = COMBO_WINDOW_S;
      run.at = at;
    } else {
      this.runs.set(seat, { count: 1, timer: COMBO_WINDOW_S, at });
    }
  }

  /** A bomb ends the run with nothing to show for it. */
  cancel(seat: Seat): void {
    this.runs.delete(seat);
  }

  step(dt: number): ComboDone[] {
    const done: ComboDone[] = [];
    for (const [seat, run] of this.runs) {
      run.timer -= dt;
      if (run.timer > 0) continue;
      this.runs.delete(seat);
      if (run.count >= COMBO_MIN) done.push({ seat, count: run.count, at: run.at });
    }
    return done;
  }

  /** Ends every open run now, for the end of a round. */
  flush(): ComboDone[] {
    return this.step(Number.POSITIVE_INFINITY);
  }
}
