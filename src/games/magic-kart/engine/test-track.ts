import type { TrackDef } from "../tracks/types";

/**
 * A plain oval for the engine's tests, easy to reason about: straights
 * along z and a bend at each end. Not one of the game's maps.
 */
export const OVAL: TrackDef = {
  id: "oval",
  name: "Oval",
  blurb: "",
  theme: "beach",
  points: [[0, 0], [0, 300], [60, 380], [140, 300], [140, 0], [60, -80]],
  width: 14,
  shoulder: 4,
  ramps: [],
  gaps: [],
  boostPads: [],
  cubeRows: [0.3],
  obstacles: [],
  openEdges: [],
};
