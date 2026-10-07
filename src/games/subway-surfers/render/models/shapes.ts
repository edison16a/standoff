import * as THREE from "three";
import type { MeshBuilder, Paint, V3 } from "../mesh-builder";

/**
 * Shapes the characters need beyond boxes and spheres: shells cut from a
 * sphere for caps, hair and panels, a curved cap peak, and dashed stitching
 * laid along a seam.
 */

/** A part of a sphere's shell. `phi` runs round from -x toward +z, `theta` down from the top. Its UVs span the patch. */
export function shell(radius: number, phi: readonly [number, number], theta: readonly [number, number], segments = 24): THREE.BufferGeometry {
  const rings = Math.max(4, Math.round(segments * ((theta[1] - theta[0]) / Math.PI)));
  const around = Math.max(4, Math.round(segments * ((phi[1] - phi[0]) / (Math.PI * 2)) * 2));
  return new THREE.SphereGeometry(radius, around, rings, phi[0], phi[1] - phi[0], theta[0], theta[1] - theta[0]);
}

/** The angle round a shell, as `shell` counts it, that points along -z: straight ahead for a character. */
export const FRONT = Math.PI * 1.5;
/** The angle round a shell that points along +z: the back. */
export const BACK = Math.PI * 0.5;

/** A cap's peak: a flat half disc reaching toward -z, bent down at its sides like a worn in brim. */
export function peakGeometry(radius: number, thickness: number, reach: number, bend: number): THREE.BufferGeometry {
  // Theta from a half turn to one and a half turns covers the half toward -z.
  const geometry = new THREE.CylinderGeometry(radius, radius, thickness, 24, 1, false, Math.PI / 2, Math.PI);
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i) * reach;
    pos.setXYZ(i, x, pos.getY(i) - bend * (x / radius) ** 2, z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

const X = new THREE.Vector3(1, 0, 0);
const a = new THREE.Vector3();
const b = new THREE.Vector3();
const dir = new THREE.Vector3();
const quat = new THREE.Quaternion();
const euler = new THREE.Euler();

/**
 * Running stitches along a seam: short dashes with gaps, each lying along
 * the line. They are tiny, so they sit just proud of the cloth beneath.
 */
export function stitches(builder: MeshBuilder, points: readonly V3[], paint: Paint, dash = 0.014, gap = 0.009, size = 0.0045): void {
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    a.set(...points[i - 1]!);
    b.set(...points[i]!);
    const length = a.distanceTo(b);
    dir.subVectors(b, a).normalize();
    quat.setFromUnitVectors(X, dir);
    euler.setFromQuaternion(quat);
    const rot: V3 = [euler.x, euler.y, euler.z];
    let t = carry;
    for (; t + dash <= length; t += dash + gap) {
      const mid = t + dash / 2;
      builder.add(new THREE.BoxGeometry(dash, size, size), paint, [a.x + dir.x * mid, a.y + dir.y * mid, a.z + dir.z * mid], rot);
    }
    // The gap runs on round a corner, so the dashes keep their rhythm.
    carry = Math.max(0, t - length);
  }
}

/** Points round an ellipse in a plane facing ±z, from angle `from` to `to`, for stitching round a curve. */
export function arc(center: V3, rx: number, ry: number, from: number, to: number, steps = 10): V3[] {
  const out: V3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = from + ((to - from) * i) / steps;
    out.push([center[0] + Math.cos(t) * rx, center[1] + Math.sin(t) * ry, center[2]]);
  }
  return out;
}
