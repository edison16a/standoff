import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * The pieces of a seated fan, built at the seat (the tread under him
 * at the origin, facing +z). Each piece carries `aPart`, 0 where it
 * takes the fan's first colour and 1 where it takes his second: the
 * body is shirt over trousers, the head skin under hair, the arms
 * sleeve then bare forearm. They are kept low poly on purpose: two
 * thousand fans are a few pixels each, and the shape that reads at that
 * size is shoulders, a head and arms.
 */

/** Where the shoulders are, from the seat; the arms swing about them in the crowd's shader. */
export const SHOULDER = { x: 0.2, y: 0.88 };

function part(geo: THREE.BufferGeometry, value: number | ((y: number, z: number) => number)): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const pos = g.getAttribute("position");
  const out = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) out[i] = typeof value === "number" ? value : value(pos.getY(i), pos.getZ(i));
  g.setAttribute("aPart", new THREE.BufferAttribute(out, 1));
  g.deleteAttribute("uv");
  return g;
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const g = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!g) throw new Error("Fan pieces did not merge.");
  return g;
}

/** The torso with its shoulders, and the thighs and shins of a seated fan. */
export function fanBody(): THREE.BufferGeometry {
  const profile = [
    [0.0, 0.4], [0.17, 0.42], [0.19, 0.64], [0.215, 0.84], [0.17, 0.94], [0.05, 1.0],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const torso = new THREE.LatheGeometry(profile, 7);
  torso.scale(1, 1, 0.66);
  const thighs = new THREE.BoxGeometry(0.36, 0.14, 0.44);
  thighs.translate(0, 0.45, 0.2);
  const shins = new THREE.BoxGeometry(0.32, 0.44, 0.12);
  shins.translate(0, 0.22, 0.4);
  return merge([part(torso, 0), part(thighs, 1), part(shins, 1)]);
}

/** The head, its hair painted on the crown and back, and the neck. */
export function fanHead(): THREE.BufferGeometry {
  const head = new THREE.SphereGeometry(0.105, 7, 5);
  head.scale(0.9, 1.06, 0.98);
  // Hair over the crown and down the back; the face stays skin.
  const skull = part(head, (y, z) => (y > 0.025 || (z < -0.02 && y > -0.05) ? 1 : 0));
  skull.translate(0, 1.11, 0.01);
  const neck = new THREE.CylinderGeometry(0.045, 0.05, 0.12, 6, 1, true);
  neck.translate(0, 1.0, 0);
  return merge([skull, part(neck, 0)]);
}

/** Both arms, each from the shoulder (the origin) up along +y; `aSide` says which. */
export function fanArms(): THREE.BufferGeometry {
  const arms: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    const arm = part(new THREE.BoxGeometry(0.085, 0.56, 0.085, 1, 2, 1).translate(0, 0.28, 0), (y) => (y > 0.26 ? 1 : 0));
    arm.setAttribute("aSide", new THREE.BufferAttribute(new Float32Array(arm.getAttribute("position").count).fill(side), 1));
    arms.push(arm);
  }
  return merge(arms);
}

/** A stadium seat: the pan and the back, behind where a fan sits. */
export function seatChair(): THREE.BufferGeometry {
  const pan = new THREE.BoxGeometry(0.48, 0.06, 0.42);
  pan.translate(0, 0.4, 0.02);
  const back = new THREE.BoxGeometry(0.48, 0.46, 0.05);
  back.rotateX(-0.12);
  back.translate(0, 0.66, -0.2);
  const g = mergeGeometries([pan.toNonIndexed(), back.toNonIndexed()], false);
  pan.dispose();
  back.dispose();
  if (!g) throw new Error("Seat pieces did not merge.");
  return g;
}
