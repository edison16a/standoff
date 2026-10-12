import * as THREE from "three";
import { MeshBuilder } from "../../mesh-builder";
import { handMaterials } from "./hand-materials";

/** Which hand. The left is the right built in a mirror, so both share one recipe. */
export type Side = "left" | "right";

/** Index, middle, ring and little finger: where each knuckle sits across the palm, and how long and thick. */
const FINGERS = [
  { x: -0.029, z: -0.044, y: 0.014, first: 0.042, rest: 0.044, r: 0.0098 },
  { x: -0.0098, z: -0.046, y: 0.0145, first: 0.046, rest: 0.049, r: 0.0102 },
  { x: 0.0098, z: -0.044, y: 0.014, first: 0.043, rest: 0.046, r: 0.0096 },
  { x: 0.028, z: -0.039, y: 0.012, first: 0.034, rest: 0.036, r: 0.0086 },
] as const;

/** Where the wrist joint is in the hand's frame, for the forearm to meet it. */
export const WRIST: readonly [number, number, number] = [0, 0.014, 0.062];

/** A gloved digit: its joints, so the rig can curl it. */
interface Digit {
  base: THREE.Group;
  joints: THREE.Group[];
}

/**
 * One gloved hand, built from rounded pieces: a padded palm, three jointed
 * segments per finger and a thumb on a ball of muscle. The origin is the
 * middle of the palm's surface, the fingers reach along -z with the palm
 * facing -y, and the thumb is on the left of a right hand.
 */
export class HandModel {
  readonly root = new THREE.Group();
  private readonly fingers: Digit[] = [];
  private readonly thumb: Digit;
  private readonly mirror: number;

  constructor(readonly side: Side) {
    this.mirror = side === "right" ? 1 : -1;
    const m = handMaterials();
    const s = this.mirror;
    const palm = new MeshBuilder();
    palm.box(0.082, 0.027, 0.092, m.glove, [0, 0.0135, 0], undefined, 0.0134);
    // A domed back and the balls of the thumb and heel round the palm off, so it reads as a hand and not a slab.
    palm.sphere(1, m.glove, [0, 0.016, 0.004], [0.042, 0.015, 0.05], 14);
    palm.sphere(1, m.glove, [-0.026 * s, 0.01, 0.02], [0.024, 0.017, 0.032], 12);
    palm.sphere(1, m.glove, [0.016 * s, 0.008, 0.032], [0.03, 0.014, 0.022], 12);
    // A hard knuckle guard and a small padded patch on the back, as tactical gloves have.
    palm.box(0.07, 0.007, 0.022, m.pad, [0.001 * s, 0.0285, -0.032], [0.12, 0, 0], 0.0034);
    palm.box(0.034, 0.003, 0.026, m.pad, [0.004 * s, 0.031, 0.012], undefined, 0.0014);
    // Glove cuff with its strap, a little wider than the wrist.
    palm.add(new THREE.CylinderGeometry(0.029, 0.031, 0.034, 14), m.glove, [0, WRIST[1], 0.056], [Math.PI / 2, 0, 0], [1.22, 1, 0.78]);
    palm.box(0.04, 0.006, 0.026, m.pad, [0.006 * s, WRIST[1] + 0.023, 0.056], undefined, 0.0025);
    this.root.add(palm.build("palm"));

    for (const f of FINGERS) this.fingers.push(this.digit([f.x * s, f.y, f.z], [f.first, f.rest * 0.55, f.rest * 0.45], f.r, m));
    this.thumb = this.digit([-0.036 * s, 0.006, 0.014], [0.034, 0.03, 0.027], 0.0118, m);
  }

  /**
   * Closes the hand. Each joint bends a little more than the one before,
   * which is how a real grip folds around a handguard or a magazine.
   */
  shape(curl: number, index: number, thumb: number): void {
    this.fingers.forEach((digit, i) => {
      const c = i === 0 ? index : curl;
      digit.base.rotation.set(-c * 1.15, 0, 0);
      digit.joints[0]!.rotation.x = -c * 1.45;
      digit.joints[1]!.rotation.x = -c * 0.9;
    });
    // Out along the hand and slightly away from it at 0, folded across the palm at 1.
    const s = this.mirror;
    const t = this.thumb;
    t.base.rotation.set(-0.2 - thumb * 0.7, (0.75 - thumb * 0.45) * s, (-0.3 - thumb * 0.6) * s);
    t.joints[0]!.rotation.x = -0.15 - thumb * 0.45;
    t.joints[1]!.rotation.x = -0.1 - thumb * 0.6;
  }

  private digit(at: readonly [number, number, number], lengths: readonly number[], radius: number, m: ReturnType<typeof handMaterials>): Digit {
    const base = new THREE.Group();
    base.position.set(...at);
    this.root.add(base);
    const joints: THREE.Group[] = [];
    let parent = base;
    lengths.forEach((length, i) => {
      // Each segment a little thinner toward the tip. One mesh each keeps the draw calls down.
      const r = radius * (1 - i * 0.08);
      const geometry = new THREE.CapsuleGeometry(r, Math.max(0.001, length - r), 3, 10);
      geometry.rotateX(Math.PI / 2);
      geometry.scale(1, 0.92, 1);
      geometry.translate(0, 0, -length / 2);
      const segment = new THREE.Mesh(geometry, m.glove);
      parent.add(segment);
      if (i < lengths.length - 1) {
        const joint = new THREE.Group();
        joint.position.set(0, 0, -length);
        parent.add(joint);
        joints.push(joint);
        parent = joint;
      }
    });
    return { base, joints };
  }

  dispose(): void {
    this.root.traverse((o) => o instanceof THREE.Mesh && o.geometry.dispose());
  }
}
