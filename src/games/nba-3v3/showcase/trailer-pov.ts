import { buildOf } from "../engine/athlete";
import type { Match } from "../engine/match";
import { RIM } from "../engine/tuning";
import type { Pose } from "./trailer-cams";
import { CAST } from "./trailer-cast";

/** The film's seconds the lens zooms between, from the release to the ball dropping into the ring. */
const ZOOM_FROM = 1.72;
const ZOOM_TO = 2.9;
/** Wide enough at the release to take in both defenders' hands, tight at the ring so the spin on the ball reads. */
const WIDE = 64;
const TIGHT = 8;
/** Eyes, as a share of the body's height, and how far in front of the face the lens sits so the head never fills it. */
const EYES = 0.93;
const AHEAD = 0.3;
/** A little toward his guide hand, so the shooting arm coming down after the follow through stays out of the lens. */
const ASIDE = 0.12;

const smooth = (v: number) => {
  const t = Math.min(1, Math.max(0, v));
  return t * t * (3 - 2 * t);
};

/**
 * The Shooter's own eyes: the lens sits at his face, turned to follow
 * the ball from his hand to the rim, and zooms in as it goes, so by the
 * time it drops through the net the ball fills enough of the frame for
 * its backspin to read.
 */
export function povAim(m: Match, u: number, g: number, out: Pose): void {
  void u;
  const s = m.athletes[CAST.shooter]!;
  const h = buildOf(s).body.height;
  const fx = Math.sin(s.yaw);
  const fz = Math.cos(s.yaw);
  // His left is (fz, -fx) when facing (fx, fz).
  out.pos.set(s.x + fx * AHEAD + fz * ASIDE, s.y + h * EYES, s.z + fz * AHEAD - fx * ASIDE);
  const b = m.ball.pos;
  // Just out of the hand the ball is overhead: the eyes stay mostly on the rim, then lock onto the ball.
  const k = 0.4 + 0.6 * smooth((g - ZOOM_FROM) / 0.45);
  out.look.set(RIM.x + (b.x - RIM.x) * k, RIM.y + (b.y - RIM.y) * k, RIM.z + (b.z - RIM.z) * k);
  out.fov = WIDE + (TIGHT - WIDE) * smooth((g - ZOOM_FROM) / (ZOOM_TO - ZOOM_FROM));
}
