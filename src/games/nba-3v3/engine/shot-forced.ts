import { traceShot } from "./physics/shot-watch";
import type { Rng } from "./rng";
import type { Family } from "./shot-calibration";
import { drawError } from "./shot-error";
import { isMake, type Outcome } from "./shot-model";
import { launchFor, type Launch, type ReleaseInput } from "./shot-release";

/**
 * A shot with its ending chosen ahead, for the showcase films and the
 * tests: release errors are drawn until the physics gives that ending,
 * so even a scripted highlight is a real flight off the real iron.
 */

/** The spread of error that tends to give each ending, and whether to throw it off the glass. */
const TRY: Record<Outcome, { spread: number; glass?: boolean }> = {
  swish: { spread: 0.02 },
  bank: { spread: 0.03, glass: true },
  roll: { spread: 0.1 },
  bounce: { spread: 0.08 },
  rimOut: { spread: 0.16 },
  inOut: { spread: 0.12 },
  boardOut: { spread: 0.3, glass: true },
  airball: { spread: 0.45 },
};

function glassFamily(family: Family): Family {
  if (family === "layup" || family === "bank") return "bank";
  if (family === "dunk" || family === "free") return family;
  return "bankJumper";
}

export function forcedLaunch(rng: Rng, input: ReleaseInput, outcome: Outcome): Launch {
  const t = TRY[outcome];
  const asked: ReleaseInput = t.glass ? { ...input, family: glassFamily(input.family) } : input;
  let backup: Launch | null = null;
  for (let i = 0; i < 48; i++) {
    const err = drawError(rng, t.spread * (1 + i / 24));
    const launch = launchFor(i < 32 ? asked : input, err.long, err.side);
    const shot = traceShot({ pos: { ...input.from }, vel: launch.vel, w: launch.spin });
    if (shot.outcome === outcome) return launch;
    if (!backup && shot.made === isMake(outcome)) backup = launch;
  }
  // Nothing gave that ending: the same result another way, or a clean aim as a last resort.
  return backup ?? launchFor(input, isMake(outcome) ? 0 : 0.5, 0);
}
