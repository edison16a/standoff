import type { GunId } from "../../../engine/guns";
import type { GunModel } from "./gun-kit";
import { buildRifle } from "./rifle";
import { buildShotgun } from "./shotgun";
import { buildSmg } from "./smg";
import { buildSniper } from "./sniper";

export type { GunModel } from "./gun-kit";

const BUILDERS: Record<GunId, (accent: string) => GunModel> = {
  rifle: buildRifle,
  shotgun: buildShotgun,
  smg: buildSmg,
  sniper: buildSniper,
};

/** A gun model, its stock and magazine base striped in `accent`. */
export function buildGun(id: GunId, accent: string): GunModel {
  return BUILDERS[id](accent);
}
