import * as THREE from "three";
import { lacquer, metal, satinMetal, type Metal } from "./materials";
import { add, hoop, turned } from "./shapes";

/**
 * A classic two handled cup on a black plinth, in gold, silver or
 * bronze, for podium places and race wins. About 0.42 m tall, origin at
 * the bottom centre.
 */
export function createCupTrophy(options: { metal?: Metal } = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = "cup-trophy";
  const kind = options.metal ?? "gold";
  const shine = metal(kind, 0.14);
  const satin = satinMetal(kind);
  add(group, turned([[0, 0], [0.09, 0], [0.09, 0.06], [0.08, 0.075], [0, 0.075]], 4).rotateY(Math.PI / 4), lacquer());
  add(group, hoop(0.075, 0.004, 0.068), shine);
  // Foot, stem with a knot, then the bowl flaring out to a rolled lip.
  add(
    group,
    turned([
      [0, 0.075], [0.07, 0.075], [0.068, 0.085], [0.05, 0.095], [0.03, 0.11], [0.018, 0.14], [0.016, 0.17],
      [0.03, 0.18], [0.032, 0.19], [0.018, 0.2], [0.02, 0.215], [0.045, 0.23], [0.075, 0.26], [0.095, 0.3],
      [0.105, 0.35], [0.108, 0.39], [0.114, 0.4], [0.11, 0.408], [0.1, 0.4], [0.096, 0.36], [0.07, 0.3], [0, 0.29],
    ]),
    shine,
  );
  add(group, hoop(0.098, 0.004, 0.33), satin);
  for (const side of [-1, 1]) {
    // Each handle is a loop from under the lip out and down to the bowl's waist.
    const curve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(side * 0.1, 0.37, 0),
      new THREE.Vector3(side * 0.2, 0.39, 0),
      new THREE.Vector3(side * 0.19, 0.27, 0),
      new THREE.Vector3(side * 0.075, 0.26, 0),
    );
    add(group, new THREE.TubeGeometry(curve, 32, 0.009, 10, false), shine);
  }
  group.userData.height = 0.41;
  return group;
}
