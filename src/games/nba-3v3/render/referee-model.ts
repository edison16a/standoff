import { BUILDS, type BuildSpec } from "../builds";
import type { Team } from "../roster";
import type { AthleteMaterials } from "./materials/athlete-materials";
import { buildAthlete, type AthleteModel } from "./models/athlete-model";

/** The referee: a lean official with short grey hair, in black shoes and socks. */
const REF: BuildSpec = {
  ...BUILDS.shooter,
  name: "Referee",
  number: 0,
  body: { height: 1.86, width: 0.98, bulk: 0.95, reach: 1 },
  look: {
    skin: "#c99a78", hair: "short", hairColor: "#57514b", beard: "none", headband: null, sleeve: null, wristband: null,
    shoe: "#111111", shoeAccent: "#2a2a2a", sock: "#111111", mouthguard: false,
  },
};

const REF_TEAM: Team = { name: "", color: "#161616", dark: "#0a0a0a", trim: "#161616" };

export interface RefereeModel {
  model: AthleteModel;
  dispose(): void;
}

/**
 * Builds the referee on the same skeleton and body as the players, so
 * the pose code drives him too, dressed in a striped short sleeved
 * shirt and long dark trousers.
 */
export function buildReferee(mats: AthleteMaterials): RefereeModel {
  const model = buildAthlete(REF, REF_TEAM, mats, { referee: true });
  return { model, dispose: () => model.dispose() };
}
