import type { ShowcaseView } from "@/platform/games/game-api";
import type { MatchView } from "../engine";
import type { FilmCam } from "./film-cams";

/** A frozen moment of the trailer, and its own camera when the film's is not the one for a still. */
export interface Still {
  /** Seconds into the trailer. */
  t: number;
  camera?: (view: MatchView) => FilmCam;
}

/** The home screen's stills, held from the trailer. */
export const STILLS: Partial<Record<ShowcaseView, Still>> = {
  poster: { t: 4.1 },
  icon: {
    t: 5.45,
    camera: (view) => {
      const r = view.athletes.find((a) => a.id === 2)!;
      const t = view.athletes.find((a) => a.id === 8)!;
      const mid = { x: (r.x + t.x) / 2, z: (r.z + t.z) / 2 };
      const dx = r.x - t.x;
      const dz = r.z - t.z;
      const l = Math.hypot(dx, dz) || 1;
      // Square on to the line of the hit, down on the turf, looking up so both stand against the night.
      const side = { x: -dz / l, z: dx / l };
      return { pos: { x: mid.x - side.x * 3.8 + (dx / l) * 2, y: 0.3, z: mid.z - side.z * 3.8 + (dz / l) * 2 }, look: { x: mid.x, y: 0.6, z: mid.z }, fov: 46 };
    },
  },
};
