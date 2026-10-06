import * as THREE from "three";
import { merge, paint } from "../models/geo";

/**
 * One fan, under seventy triangles: a tapered body in a coat or a shirt,
 * a head whose crown is their hair, and two arms. Seen from across the pitch that
 * reads as a person, and four thousand of them stay cheap. Each vertex
 * carries flags for the shader: which part it is, so the head takes the
 * fan's skin, the crown their hair, and the arms lift on a goal.
 */
export function fanGeometry(): THREE.BufferGeometry {
  // The paint marks the parts: magenta the head, cyan the arms. No caps: the head and the seat hide them.
  const torso = paint(new THREE.CylinderGeometry(0.19, 0.16, 0.64, 6, 1, true), "#ffffff", { at: [0, 0.48, 0], scale: [1, 1, 0.68] });
  const shoulders = paint(new THREE.CylinderGeometry(0.07, 0.2, 0.14, 6, 1, true), "#ffffff", { at: [0, 0.87, 0], scale: [1, 1, 0.7] });
  const skull = paint(new THREE.IcosahedronGeometry(0.115, 0), "#ff00ff", { at: [0, 1.04, 0], scale: [0.95, 1.12, 1] });
  const arm = (x: number) => paint(new THREE.BoxGeometry(0.1, 0.5, 0.1), "#00ffff", { at: [x, 0.58, 0.02] });
  const geometry = merge([torso, shoulders, skull, arm(-0.25), arm(0.25)]);
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const colours = geometry.getAttribute("color") as THREE.BufferAttribute;
  const head = new Float32Array(colours.count);
  const hairFlag = new Float32Array(colours.count);
  const armFlag = new Float32Array(colours.count);
  for (let i = 0; i < colours.count; i++) {
    const [r, g] = [colours.getX(i), colours.getY(i)];
    const isHead = r > 0.9 && g < 0.1;
    // The crown of the head and the back of it are hair.
    const hair = isHead && (position.getY(i) > 1.07 || position.getZ(i) < -0.06);
    head[i] = isHead && !hair ? 1 : 0;
    hairFlag[i] = hair ? 1 : 0;
    armFlag[i] = r < 0.1 && g > 0.9 ? 1 : 0;
  }
  geometry.deleteAttribute("color");
  geometry.setAttribute("aHead", new THREE.BufferAttribute(head, 1));
  geometry.setAttribute("aHair", new THREE.BufferAttribute(hairFlag, 1));
  geometry.setAttribute("aArm", new THREE.BufferAttribute(armFlag, 1));
  return geometry;
}
