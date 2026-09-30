import * as THREE from "three";
import type { MatchEvent } from "../engine/events";
import type { Spot, TvCamera } from "../render/cameras/tv-camera";
import type { FightScene } from "../render/fight-scene";
import { playStep, STEP } from "./playback";
import { holdPose } from "./pose-hold";
import { iconShot, posterShot } from "./shots";
import { CYCLE_S, KNOCKDOWNS, Trailer } from "./trailer";

/**
 * The stills, in match milliseconds after the knockout hook lands: the
 * puncher is held at `hold`, the hook at full stretch, while the fight
 * runs on to `after` for the other boxer's knees to go.
 */
const STILLS = { icon: { hold: 30, after: 450 }, poster: { hold: 30, after: 420 } } as const;
/** The glove's centre stops this short of the middle of the face, so the leather sits on the jaw, in metres. */
const GAP = 0.07;
/** The jaw sits this far under the middle of the face, in metres, and that is where the glove goes. */
const JAW = 0.05;

/**
 * Plays the trailer forward without drawing to the knockout, then poses
 * it as key art: the puncher held at full stretch, the other boxer
 * carried on into his fall and moved back onto the glove, since the fall
 * drops him and drifts him away from it, and a fresh burst of sparks off the jaw.
 * `?hold=` and `?after=` on the showcase page change the moment, for
 * looking it over. Returns the camera to draw it with.
 */
export function stageStill(view: "icon" | "poster", scene: FightScene, tv: TvCamera, hear: (events: MatchEvent[]) => void): THREE.PerspectiveCamera {
  const query = new URLSearchParams(window.location.search);
  const hold = Number(query.get("hold") ?? STILLS[view].hold);
  const after = Number(query.get("after") ?? STILLS[view].after);
  const trailer = new Trailer();
  let clock = 0;
  let landedAt = Infinity;
  let restore: (() => void) | null = null;
  // Where both stood as the hook landed: the puncher sets off for a neutral corner straight after.
  let spots: [Spot, Spot] = [{ x: -0.5, z: 0 }, { x: 0.5, z: 0 }];
  for (let step = 1; step <= CYCLE_S / STEP && trailer.match.now < landedAt + after; step++) {
    clock = playStep(trailer, scene, step * STEP, clock, (events) => {
      if (events.some((e) => e.type === "knockdown" && e.knockdowns === KNOCKDOWNS)) landedAt = trailer.match.now;
      hear(events);
    });
    if (!restore && trailer.match.now >= landedAt + hold) {
      restore = holdPose(scene.models[0].root);
      spots = [{ ...trailer.match.footwork.spots[0] }, { ...trailer.match.footwork.spots[1] }];
    }
  }
  restore?.();
  const glove = scene.glove(0, "right", new THREE.Vector3());
  const face = scene.animators[1].face(new THREE.Vector3());
  // Lifted as well as slid, so the glove still meets the jaw once the knees have gone; the feet are out of frame.
  const slide = glove.sub(face);
  slide.addScaledVector(slide.clone().setY(0).normalize(), -GAP);
  slide.y = Math.max(0, slide.y + JAW);
  scene.models[1].root.position.add(slide);
  scene.models[1].root.updateMatrixWorld(true);
  scene.fx.clear();
  scene.impact(1, 0, 0.6, false);
  for (let i = 0; i < 4; i++) scene.fx.update(STEP);
  return view === "icon" ? iconShot(spots, tv) : posterShot(spots, tv);
}
