import type { WeaponId } from "../../../engine/weapons";
import { buildAk47 } from "./ak47";
import type { GunModel } from "./gun-kit";
import { buildRifle } from "./rifle";
import { buildShotgun } from "./shotgun";
import { buildSmg } from "./smg";

export type { GunModel } from "./gun-kit";

const BUILDERS: Record<WeaponId, () => GunModel> = {
  shotgun: buildShotgun,
  smg: buildSmg,
  rifle: buildRifle,
  ak47: buildAk47,
};

/** A fresh model of a weapon. Materials are shared, geometry is its own. */
export function buildGun(weapon: WeaponId): GunModel {
  return BUILDERS[weapon]();
}
