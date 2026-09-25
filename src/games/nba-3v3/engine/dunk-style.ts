import type { DunkStyle } from "../roster";
import { charOf } from "./athlete";
import { weighted, type Rng } from "./rng";
import { RIM } from "./tuning";
import type { Athlete } from "./types";

export interface DunkPlan {
  style: DunkStyle;
  /** Seconds from takeoff to the slam: the showier dunks need more hang time. */
  air: number;
  /** Seconds hanging on the rim after the slam, or 0 to let go straight away. */
  rimHang: number;
}

/** Hang time for each dunk, takeoff to slam. */
const AIR: Record<DunkStyle, number> = {
  scoop: 0.46, tomahawk: 0.46, reverse: 0.5, hammer: 0.44, rimhang: 0.44,
  flush: 0.42, cockback: 0.48, clutch: 0.54, spin360: 0.56, windmill: 0.54,
};

/** Power dunks sometimes grab the rim on the way through. */
const GRABS: readonly DunkStyle[] = ["hammer", "tomahawk", "cockback", "flush"];

/**
 * Picks the dunk. Along the baseline it is often a reverse, in traffic
 * a power dunk, and otherwise the star's own signature most of the
 * time, with the odd showier one from those with the legs for it.
 */
export function chooseDunk(rng: Rng, a: Athlete, open: boolean): DunkPlan {
  const c = charOf(a);
  const st = c.stats;
  const baseline = a.z < RIM.z + 0.9 && Math.abs(a.x - RIM.x) > 0.8;
  let style: DunkStyle;
  if (baseline && rng() < 0.6) style = "reverse";
  else if (rng() < 0.55) style = c.dunk;
  else if (!open) style = st.strength >= 8 ? "hammer" : "flush";
  else {
    style = weighted<DunkStyle>(rng, {
      flush: 1,
      tomahawk: st.strength >= 7 ? 1 : 0.3,
      windmill: st.speed >= 8 ? 0.6 : 0.1,
      spin360: st.speed >= 9 ? 0.4 : 0,
      clutch: 0.3,
    });
  }
  const rimHang = style === "rimhang" ? 0.55 : GRABS.includes(style) && rng() < 0.35 ? 0.28 : 0;
  return { style, air: AIR[style], rimHang };
}
