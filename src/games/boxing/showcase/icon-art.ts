import * as THREE from "three";
import type { MatchEvent } from "../engine/events";
import type { Spot, TvCamera } from "../render/cameras/tv-camera";
import type { FightScene } from "../render/fight-scene";
import { playStep, STEP } from "./playback";
import { holdPose } from "./pose-hold";
import { CYCLE_S, KNOCKDOWNS, Trailer } from "./trailer";

/**
 * The icon's moments, in match milliseconds after the knockout hook
 * lands: the champion is held at `hold`, the arm level and coming round
 * so it reads as a hook and his face still shows, and the fight runs on
 * to `after` so the other boxer's knees have gone.
 */
const MOMENT = { hold: -180, after: 500 };

/** Where the fallen boxer goes, in metres from the champion: this far behind him and this far to his left (negative is his right). */
const BEHIND = 1.2;
const ASIDE = -0.7;
/** The fallen boxer's face is lifted to at least this height, in metres, so his sag shows above the title. */
const FALLEN_FACE_Y = 1.55;

/** The lens: this far in front of the champion, this high, aimed at this height on him, and this far to his left. */
const LENS = { distance: 1.75, height: 0.9, lookY: 1.3, aside: -0.8, fov: 42 };

export interface IconArt {
  camera: THREE.PerspectiveCamera;
  /** The champion's face, for the showcase's side light. */
  hero: THREE.Vector3;
}

/**
 * The icon as a fight poster: the red champion big and close, three
 * quarters to the lens as his right hook comes round level, a flare of sparks off
 * the glove, and the blue boxer behind him on his way to the canvas.
 * It is two moments of the real trailer put together, as key art is:
 * the champion held as he throws the knockout hook, and the other boxer a
 * beat later, turned and set down behind him so both read at once.
 * `?hold=` and `?after=` on the showcase page change the moments.
 */
export function stageIconArt(scene: FightScene, tv: TvCamera, hear: (events: MatchEvent[]) => void): IconArt {
  const query = new URLSearchParams(window.location.search);
  const hold = Number(query.get("hold") ?? MOMENT.hold);
  const after = Number(query.get("after") ?? MOMENT.after);
  // A dry run finds when the knockout lands, so the champion can be held a little before it too.
  const landedAt = knockoutAt();
  const trailer = new Trailer();
  let clock = 0;
  let restore: (() => void) | null = null;
  let spots: [Spot, Spot] = [{ x: -0.5, z: 0 }, { x: 0.5, z: 0 }];
  for (let step = 1; step <= CYCLE_S / STEP && trailer.match.now < landedAt + after; step++) {
    clock = playStep(trailer, scene, step * STEP, clock, hear);
    if (!restore && trailer.match.now >= landedAt + hold) {
      restore = holdPose(scene.models[0].root);
      spots = [{ ...trailer.match.footwork.spots[0] }, { ...trailer.match.footwork.spots[1] }];
    }
  }
  restore?.();
  const red = scene.models[0].root;
  const blue = scene.models[1].root;
  // The way the champion faces, and his left, on the floor.
  const ahead = new THREE.Vector3(spots[1].x - spots[0].x, 0, spots[1].z - spots[0].z).normalize();
  const left = new THREE.Vector3(ahead.z, 0, -ahead.x);
  // Half a turn about the champion puts the falling boxer behind him, still falling away, now facing the lens.
  const centre = new THREE.Vector3(spots[0].x, 0, spots[0].z);
  const off = blue.position.clone().sub(centre).setY(0);
  const y = blue.position.y;
  blue.position.copy(centre).addScaledVector(ahead, -BEHIND).addScaledVector(left, ASIDE).setY(y);
  blue.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), Math.PI);
  // Keep whatever drift the fall gave him along the line, so he still reads as knocked back.
  blue.position.addScaledVector(ahead, -Math.max(0, off.dot(ahead) - 1));
  blue.updateMatrixWorld(true);
  // Lifted, as the poster lifts him, since the fall takes him below the title; his feet are out of sight.
  const face = scene.animators[1].face(new THREE.Vector3());
  blue.position.y += Math.max(0, FALLEN_FACE_Y - face.y);
  blue.updateMatrixWorld(true);
  red.updateMatrixWorld(true);

  // Sparks fly off the glove toward the lens, as if the punch lands on the viewer.
  scene.fx.clear();
  const glove = scene.glove(0, "right", new THREE.Vector3());
  scene.fx.hit(glove, ahead.clone().negate(), 0.8);
  for (let i = 0; i < 4; i++) scene.fx.update(STEP);

  const hero = scene.animators[0].face(new THREE.Vector3());
  tv.setFov(LENS.fov);
  const camera = tv.camera;
  camera.position.copy(centre).addScaledVector(ahead, LENS.distance).addScaledVector(left, LENS.aside).setY(LENS.height);
  camera.lookAt(new THREE.Vector3(centre.x, LENS.lookY, centre.z).addScaledVector(left, LENS.aside * 0.3));
  return { camera, hero };
}

/** Match milliseconds at which the trailer's knockout blow lands. */
function knockoutAt(): number {
  const trailer = new Trailer();
  for (let step = 1; step <= CYCLE_S / STEP; step++) {
    if (trailer.advanceTo(step * STEP).some((e) => e.type === "knockdown" && e.knockdowns === KNOCKDOWNS)) return trailer.match.now;
  }
  return Infinity;
}
