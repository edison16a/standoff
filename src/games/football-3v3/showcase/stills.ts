import type { ShowcaseView } from "@/platform/games/game-api";
import type { MatchView } from "../engine";
import { JUKER, TACKLER, type FilmCam } from "./film-cams";

/** A frozen moment of the trailer, and its own camera when the film's is not the one for a still. */
export interface Still {
  /** Seconds into the trailer. */
  t: number;
  camera?: (view: MatchView) => FilmCam;
  /** How strong the warm key light is, against the film's. */
  key?: number;
}

/** The receiver and the corner who wraps him up, by id in the seeded game. */
const RUNNER = JUKER;

/**
 * Low and just ahead of the runner, looking back up his line, so he
 * drives straight at the viewer like a cover star. The camera sits a
 * little off his line, which puts the diving tackler flat out beside him.
 */
function coverCam(view: MatchView): FilmCam {
  const r = view.athletes.find((a) => a.id === RUNNER)!;
  const t = view.athletes.find((a) => a.id === TACKLER)!;
  const l = Math.hypot(r.vx, r.vz) || 1;
  const d = { x: r.vx / l, z: r.vz / l };
  const ahead = 2.6;
  const side = 1.1;
  // Aimed low and part way to the tackler, so both sit above the logo with the runner still in front.
  const look = { x: r.x + (t.x - r.x) * 0.3, y: 0.75, z: r.z + (t.z - r.z) * 0.2 };
  return { pos: { x: r.x + d.x * ahead - d.z * side, y: 0.5, z: r.z + d.z * ahead + d.x * side }, look, fov: 50 };
}

/** The home screen's stills, held from the trailer. */
export const STILLS: Partial<Record<ShowcaseView, Still>> = {
  // The corner leaving his feet at the receiver who has just pulled the ball in.
  poster: { t: 6.31 },
  // A beat before the wrap: the receiver and the ball at us, the tackler flying in beside him.
  icon: { t: 6.1, key: 2.5, camera: coverCam },
};
