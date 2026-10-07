import * as THREE from "three";
import type { MatchView } from "../engine";
import type { MatchRenderer } from "../render/match-renderer";
import type { FilmCam } from "./film-cams";
import { FilmLights } from "./film-lights";
import { labView } from "./lab";

/**
 * The icon's key art: the lab's keyart stage, a ball carrier at full
 * sprint with two defenders leaving their feet at him from either side,
 * held a beat before they reach him. The seeded game has no such moment,
 * so it is staged with the real engine pieces (lab-scenes.ts) and lit
 * like the film.
 */
export const KEY_ART = {
  /** Seconds into the stage: both defenders in the air, neither on him yet. */
  t: 0.6,
  /** The warm key against the film's, so the carrier's front reads at a glance. */
  key: 2.4,
};

/** Frames played through before the moment, so the bodies arrive in their poses. */
const LEAD_IN = 20;

/** Low and just ahead of the carrier, looking back up his run, so he drives at the viewer between the two divers. */
export function keyArtCam(view: MatchView): FilmCam {
  const c = view.athletes.find((a) => a.id === 0)!;
  // The stage's run line, up +z: his velocity swings as the divers reach him, the camera should not.
  const d = { x: 0, z: 1 };
  const ahead = 3.8;
  const side = 0.4;
  const pos = { x: c.x + d.x * ahead - d.z * side, y: 0.45, z: c.z + d.z * ahead + d.x * side };
  // Aimed a little behind him, so the divers' reach fills the frame either side above the title.
  return { pos, look: { x: c.x - d.x * 0.6, y: 0.95, z: c.z - d.z * 0.6 }, fov: 52 };
}

/** Draws the key art still through the real renderer. `t` moves the moment, for a review script. */
export class KeyArt {
  private readonly lights: FilmLights;

  constructor(private readonly renderer: MatchRenderer, scene: THREE.Scene, private readonly base: MatchView) {
    this.lights = new FilmLights(scene);
    // The stadium at full roar, as in the film.
    renderer.onEvent({ type: "touchdown", team: 0, id: 0, pass: 0, conversion: false });
  }

  hold(t = KEY_ART.t): void {
    for (let k = LEAD_IN; k > 0; k--) {
      const at = Math.max(0, t - k / 30);
      this.renderer.settle(labView(this.base, "keyart", at), at * 1000, 1 / 30);
    }
    const view = labView(this.base, "keyart", t);
    const cam = keyArtCam(view);
    const pos = new THREE.Vector3(cam.pos.x, cam.pos.y, cam.pos.z);
    const look = new THREE.Vector3(cam.look.x, cam.look.y, cam.look.z);
    this.renderer.director.setFixed(pos, look, cam.fov);
    this.lights.setKey(KEY_ART.key);
    this.lights.aim(pos, look);
    this.renderer.draw(view, t * 1000);
  }

  dispose(): void {
    this.lights.dispose();
  }
}
