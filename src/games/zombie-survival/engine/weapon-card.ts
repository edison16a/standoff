import { falloff, WEAPON_IDS, WEAPONS, type WeaponId, type WeaponSpec } from "./weapons";

/** The five bars on the weapon card, each from 0 to 1 across the guns. */
export interface WeaponBars {
  damage: number;
  rate: number;
  range: number;
  magazine: number;
  reload: number;
}

/** Half a torso's width, in metres. A cone wider than this at some distance mostly misses there. */
const TORSO = 0.3;
/** No zombie is ever further off than this, so longer reach counts the same. */
const LONGEST = 40;

/**
 * How far a gun still does its job, in metres: where its cone grows wider
 * than a torso, or its damage falls under half, whichever comes first.
 */
export function reach(spec: WeaponSpec): number {
  let half = LONGEST;
  for (let m = 0; m <= LONGEST; m += 0.5) {
    if (falloff(spec.range, m) < 0.5) {
      half = m;
      break;
    }
  }
  return Math.min(LONGEST, half, TORSO / spec.spread);
}

export function weaponBars(id: WeaponId): WeaponBars {
  const all = WEAPON_IDS.map((w) => WEAPONS[w]);
  const spec = WEAPONS[id];
  const perShot = (w: WeaponSpec) => w.damage * w.pellets;
  const scale = (value: number, values: number[]) => Math.min(1, 0.2 + (0.8 * value) / Math.max(...values));
  return {
    damage: scale(perShot(spec), all.map(perShot)),
    rate: scale(spec.rate, all.map((w) => w.rate)),
    range: scale(reach(spec), all.map(reach)),
    magazine: scale(spec.magazine, all.map((w) => w.magazine)),
    // Faster reloads fill more of the bar.
    reload: scale(1 / spec.reload, all.map((w) => 1 / w.reload)),
  };
}

/** A word for how far a gun reaches. */
function rangeWord(metres: number): string {
  if (metres < 8) return "Up close";
  if (metres < 20) return "Medium";
  return "Long";
}

/** Plain words and numbers for the card, like "9 x 0.42" or "13 per second". */
export function weaponFacts(id: WeaponId): Record<keyof WeaponBars, string> {
  const w = WEAPONS[id];
  return {
    damage: w.pellets > 1 ? `${w.pellets} x ${w.damage}` : `${w.damage}`,
    rate: `${w.rate} per second`,
    range: rangeWord(reach(w)),
    magazine: w.style === "shells" ? `${w.magazine} shells` : `${w.magazine} rounds`,
    reload: w.style === "shells" ? `${w.shell}s per shell` : `${w.reload}s`,
  };
}
