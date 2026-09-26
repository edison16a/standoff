import * as THREE from "three";
import type { Battle } from "../engine/battle";
import { eyeOf, type Fighter } from "../engine/fighter";
import { sightBlocked } from "../engine/geometry";
import { castRay, MAX_RANGE } from "../engine/hit";
import { coneOf } from "../engine/shooting";
import { dir3 } from "../engine/vec";
import type { FighterView } from "./fighter-view";

const v = new THREE.Vector3();
const head = new THREE.Vector3();

/**
 * Where a fighter's next shot would land, drawn as the crosshair in their
 * view: along their aim with the kick added, stopped by the first thing
 * in the way. `gap` opens with the spread. Pixels from the pane's bottom
 * left, or null when it points behind the camera.
 */
export function crosshair(f: Fighter, b: Battle, camera: THREE.PerspectiveCamera, w: number, h: number): { at: { x: number; y: number }; gap: number } | null {
  const d = dir3(f.aim.yaw + f.gun.kick.yaw, f.aim.pitch + f.gun.kick.pitch);
  const hit = castRay(eyeOf(f), d, b.pieces, b.fighters, f.id, MAX_RANGE);
  v.set(hit.trace.to.x, hit.trace.to.y, hit.trace.to.z).project(camera);
  if (v.z > 1) return null;
  const halfFov = (camera.fov * Math.PI) / 360;
  const gap = 6 + (Math.tan(coneOf(f)) / Math.tan(halfFov)) * (h / 2);
  return { at: { x: ((v.x + 1) / 2) * w, y: ((v.y + 1) / 2) * h }, gap };
}

/**
 * Which name tags a view shows. Everyone's in the television view. Over a
 * player's shoulder: never their own, always their teammates', and an
 * enemy's only while the camera can see them, so a tag never gives away
 * someone hiding behind cover.
 */
export function showTags(views: ReadonlyMap<number, FighterView>, b: Battle, viewer: Fighter | null, camera: THREE.PerspectiveCamera): void {
  for (const f of b.fighters) {
    const view = views.get(f.id);
    if (!view) continue;
    let shown = f.alive;
    if (shown && viewer) {
      if (f.id === viewer.id) shown = false;
      else if (f.team !== viewer.team) {
        view.head(head);
        shown = !sightBlocked({ x: camera.position.x, y: camera.position.y, z: camera.position.z }, { x: head.x, y: head.y, z: head.z }, b.pieces);
      }
    }
    view.tag.group.visible = shown;
    if (shown) view.tag.fit(camera.fov);
  }
}
