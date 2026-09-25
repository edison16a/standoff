import type { SkillKind } from "../../engine/types";
import { run } from "./moves";
import type { Pose } from "./pose";

/**
 * Skill moves and the wrong footed defender. The body's run, its turn
 * and the ball come from the engine's script (engine/skill-moves.ts);
 * these poses add the legs' work on top of a short dribbling stride.
 */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const bump = (v: number) => Math.sin(Math.PI * clamp01(v));

/** `u` is the move's progress, 0 to 1. `side` is the engine's skill side. */
export function skillPose(kind: SkillKind, u: number, side: 1 | -1, stride: number, speed: number): Pose {
  const p = run(stride, Math.min(speed, 4), true);
  switch (kind) {
    case "rainbow": {
      // The heel flick: the back leg kicks up behind while the body leans in.
      const flick = bump((u - 0.15) / 0.3);
      p.hipRX += 0.6 * flick;
      p.kneeR += 1.6 * flick;
      p.pitch += 0.15 * flick;
      p.shLZ += 0.5 * flick;
      p.shRZ += 0.5 * flick;
      break;
    }
    case "crossover":
    case "elastico": {
      const cut = bump(u / 0.7);
      p.roll = -side * 0.25 * cut;
      p.hipRZ += 0.4 * cut;
      p.spineY = side * 0.3 * cut;
      break;
    }
    case "dragback": {
      const sole = bump(u / 0.5);
      p.hipRX -= 0.5 * sole;
      p.kneeR += 0.3 * sole;
      p.pitch -= 0.1 * sole;
      p.shLZ += 0.4 * sole;
      break;
    }
    case "roulette": {
      const spin = bump(u);
      p.shLZ += 0.5 * spin;
      p.shRZ += 0.5 * spin;
      p.kneeL += 0.3 * spin;
      break;
    }
  }
  return p;
}

/** Wrong footed: weight caught on the heels, arms out, then turning to chase. */
export function beaten(t: number, length: number): Pose {
  const p = run(t * 1.5, 2, false);
  const k = bump(t / length);
  p.pitch -= 0.25 * k;
  p.shLZ += 0.8 * k;
  p.shRZ += 0.8 * k;
  p.kneeL += 0.3 * k;
  p.kneeR += 0.3 * k;
  p.lift -= 0.04 * k;
  return p;
}
