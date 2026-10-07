import type { AthleteView } from "../../../engine/view";
import type { Joint, Pose } from "../pose";
import { mirror } from "./body-keys";
import { PINNED, carrierFall } from "./carrier";
import { downAndUp } from "./getup";
import { lungeFor } from "./lunges";
import { missFall } from "./misses";
import { pileFall, tacklerFall } from "./tackler";

export { stumbleOver } from "./stumble";

const ARMS: Joint[] = ["shLX", "shLY", "shLZ", "elL", "shRX", "shRY", "shRZ", "elR"];

/** A carrier tackled from his right falls the mirrored way, but the ball stays tucked under the same arm. */
function keepArms(mirrored: Pose, own: Pose): Pose {
  for (const j of ARMS) mirrored[j] = own[j];
  return mirrored;
}

/**
 * The authored pose for a lunge, a man down in a tackle preset, or a
 * missed tackle, played on the engine's own clock for the action. Null
 * when none applies, for the plain poses to take over.
 */
export function tacklePose(a: AthleteView, run: () => Pose): Pose | null {
  const t = a.actionT;
  if (a.action === "lunge") return lungeFor(a.lunge ?? "wrap", t / Math.max(0.01, a.actionDur));
  if (a.action !== "down") return null;
  if (a.tackle) {
    const { kind, role, side, prone } = a.tackle;
    const fall = role === "carrier" ? (prone ? PINNED : carrierFall(kind, run())) : role === "pile" ? pileFall(t) : tacklerFall(kind, t);
    const p = downAndUp(fall.keys, fall.lying, t, a.actionDur);
    if (side > 0) return p;
    return role === "carrier" ? keepArms(mirror(p), p) : mirror(p);
  }
  const miss = a.downCause ? missFall(a.downCause) : null;
  if (!miss) return null;
  // Misses are authored falling to the right: a juked man falls the way he bit, the rest by the player.
  const left = a.downCause === "juked" ? a.stumble?.side === 1 : a.id % 2 === 1;
  const p = downAndUp(miss.keys, miss.lying, t, a.actionDur);
  return left ? mirror(p) : p;
}
