import type { Fighter } from "../engine/fighter";
import { dirOf, type V3 } from "../engine/vec";
import type { Lens } from "./trailer";

/** A film camera for one frame: where it stands, what it looks at, and the lens. */
export interface LensShot {
  from: V3;
  at: V3;
  fov: number;
}

const NOVA = 0;
const BLAZE = 1;
const VEX = 2;
const KITE = 3;

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);

/** A point `ahead` along a flat direction, `side` across it to the left and `up` high, from a fighter's feet. */
function around(f: Fighter, dir: { x: number; z: number }, ahead: number, side: number, up: number): V3 {
  return { x: f.pos.x + dir.x * ahead - dir.z * side, y: up, z: f.pos.z + dir.z * ahead + dir.x * side };
}

const chest = (f: Fighter, y = 1.15): V3 => ({ x: f.pos.x, y, z: f.pos.z });

/**
 * The trailer's own cameras, set by who is where so they ride along
 * with the fight. They sit low and close with long lenses, so the
 * fighters loom over the lens and the field behind them compresses.
 */
export function lensShot(lens: Lens, fighters: readonly Fighter[], u: number): LensShot {
  const e = ease(u);
  const f = (id: number) => fighters[id]!;
  switch (lens) {
    case "run": {
      // Backing away in front of Blaze as he sprints up the flank toward the lens.
      const b = f(BLAZE);
      return { from: around(b, { x: 0, z: -1 }, mix(3.8, 3.2, e), mix(1.2, 0.9, e), 0.7), at: chest(b, 1.1), fov: 36 };
    }
    case "rise": {
      // Out past the lip of Nova's bunker: he comes up over it and fires right at us.
      const n = f(NOVA);
      return { from: around(n, dirOf(n.look), 4.2, mix(-1.5, -1.2, e), 0.95), at: chest(n, 1.2), fov: 36 };
    }
    case "fall": {
      // In front of Kite at the far end as the paint takes him down.
      const k = f(KITE);
      return { from: around(k, { x: -0.23, z: 0.97 }, 3.6, -1.6, 0.8), at: chest(k, 0.9), fov: 40 };
    }
    case "blast": {
      // Low beside the bunker, Blaze's shotgun going off into Vex a few paces away.
      const v = f(VEX);
      const b = f(BLAZE);
      const mid = { x: (v.pos.x + b.pos.x) / 2, z: (v.pos.z + b.pos.z) / 2 };
      return { from: { x: mid.x + mix(-0.4, -0.1, e), y: 0.6, z: mid.z - mix(4.6, 4.0, e) }, at: { x: mid.x, y: 1.0, z: mid.z }, fov: 42 };
    }
    case "win": {
      // Close on Blaze as the round is won, the lens drifting round him.
      const b = f(BLAZE);
      return { from: around(b, dirOf(b.look), -3.2, mix(-1.4, 0.2, e), 0.8), at: chest(b, 1.3), fov: 36 };
    }
  }
}
