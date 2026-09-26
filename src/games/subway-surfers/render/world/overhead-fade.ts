import * as THREE from "three";
import { blocksView, type Overhang } from "../models/overhead";

/** How see through a piece gets while it is in the way. */
const FADED = 0.12;
/** How fast it fades, per second. Quick, since at speed a gantry passes the lens in a moment. */
const RATE = 14;

interface Faded {
  /** Where the piece hangs. */
  span: Overhang;
  materials: THREE.Material[];
  opacity: number;
}

/**
 * Fades the gantries and wires that come between the camera and the
 * runner. From a train roof the camera rides at the height of the beams,
 * signal heads and wires, which would sweep across the whole picture and
 * cut through the runner. Each piece gets its own copies of its
 * materials, so fading one leaves the rest.
 */
export class OverheadFade {
  private readonly pieces = new Map<THREE.Object3D, Faded>();

  /** Takes over a piece just built, hanging where `span` says, giving it materials of its own to fade. */
  adopt(piece: THREE.Object3D, span: Overhang): void {
    const materials: THREE.Material[] = [];
    piece.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh || Array.isArray(mesh.material)) return;
      const own = mesh.material.clone();
      own.userData.shared = false;
      mesh.material = own;
      materials.push(own);
    });
    this.pieces.set(piece, { span, materials, opacity: 1 });
  }

  /** Lets go of a piece dropped behind, and frees its materials. */
  drop(piece: THREE.Object3D): void {
    const entry = this.pieces.get(piece);
    if (!entry) return;
    for (const material of entry.materials) material.dispose();
    this.pieces.delete(piece);
  }

  /** `eye` is the camera and `head` the runner's head, as heights and z along the track. */
  update(eye: { y: number; z: number }, head: { y: number; z: number }, dt: number): void {
    const k = 1 - Math.exp(-RATE * dt);
    for (const entry of this.pieces.values()) {
      const target = blocksView(entry.span, eye, head) ? FADED : 1;
      if (entry.opacity === target) continue;
      entry.opacity += (target - entry.opacity) * k;
      if (Math.abs(target - entry.opacity) < 0.01) entry.opacity = target;
      const see = entry.opacity < 1;
      for (const material of entry.materials) {
        if (material.transparent !== see) {
          material.transparent = see;
          // A see through piece must not hide what is behind it from the depth test.
          material.depthWrite = !see;
          material.needsUpdate = true;
        }
        material.opacity = entry.opacity;
      }
    }
  }

  clear(): void {
    for (const piece of [...this.pieces.keys()]) this.drop(piece);
  }
}
