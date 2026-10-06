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

/** The juker and the tackler who flies at him, by id in the seeded game. */
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
  const ahead = 2;
  const side = 1.1;
  // Aimed a fifth of the way to the tackler, so both fit with the runner still in front.
  const look = { x: r.x + (t.x - r.x) * 0.2, y: 1.35, z: r.z + (t.z - r.z) * 0.2 };
  return { pos: { x: r.x + d.x * ahead - d.z * side, y: 0.5, z: r.z + d.z * ahead + d.x * side }, look, fov: 56 };
}

/** The home screen's stills, held from the trailer. */
export const STILLS: Partial<Record<ShowcaseView, Still>> = {
  // The corner flying in at the runner a beat before the hit, the goal posts behind them.
  poster: { t: 6.45 },
  // The juke in the big hit shot, a beat before contact: the runner and the ball at us, the tackler diving in beside him.
  icon: { t: 6.2, key: 2.5, camera: coverCam },
};
