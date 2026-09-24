import type { ActivePunch } from "../../engine/fighter";
import { PUNCHES } from "../../engine/rules";

/** How a punch looks at one instant, each part 0 to 1. */
export interface PunchShape {
  /** From the guard (0) to the glove on the target (1). */
  extend: number;
  /** The wind up: the glove drawn back and the shoulder loaded. */
  cock: number;
  /** A hook's swing out wide before it comes round. */
  swing: number;
  /** The hips and shoulders turning into it. */
  turn: number;
  /** The step in behind it. */
  lunge: number;
  /** Seconds to impact, negative once it has landed. For the glint and the whoosh. */
  toImpact: number;
}

export const REST: PunchShape = { extend: 0, cock: 0, swing: 0, turn: 0, lunge: 0, toImpact: Infinity };

const HOLD_MS = 55;

function smooth(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/**
 * The shape of a punch over its life: a telegraphed wind up, a fast
 * accelerating drive to the target, a short hold on impact and a
 * smooth return to the guard. Pure, so the replay and the showcase
 * see exactly the same punch.
 */
export function punchShape(punch: ActivePunch, now: number): PunchShape {
  const travel = PUNCHES[punch.style].travelMs * (punch.tired ? 1.3 : 1);
  const driveFrom = punch.impactAt - travel;
  const toImpact = (punch.impactAt - now) / 1000;
  if (now < punch.start || now >= punch.endAt) return { ...REST, toImpact };
  if (now < driveFrom) {
    const windup = driveFrom - punch.start;
    const cock = smooth((now - punch.start) / Math.max(1, windup * 0.6));
    return { extend: 0, cock, swing: 0, turn: -0.35 * cock, lunge: 0, toImpact };
  }
  if (now < punch.impactAt) {
    const t = (now - driveFrom) / travel;
    // Accelerating into the target, which is what makes a punch look heavy.
    const drive = t * t * (1.6 - 0.6 * t);
    const cocked = punch.start < driveFrom ? 1 : 0;
    return {
      extend: drive,
      cock: cocked * (1 - smooth(t * 2.5)),
      swing: punch.style === "hook" ? Math.sin(Math.PI * Math.min(1, t * 1.1)) : 0,
      turn: smooth(t * 1.4),
      lunge: smooth(t),
      toImpact,
    };
  }
  const since = now - punch.impactAt;
  const back = since < HOLD_MS ? 0 : smooth((since - HOLD_MS) / (punch.endAt - punch.impactAt - HOLD_MS));
  return { extend: 1 - back, cock: 0, swing: 0, turn: 1 - back, lunge: 1 - back, toImpact };
}
