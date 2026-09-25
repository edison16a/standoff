import * as THREE from "three";
import type { CharacterId } from "../characters";
import { speedOf, type Kart } from "../engine/kart";
import { DRIVE } from "../engine/tuning";
import { GLIDER_TOP, gliderDesign, MAST_BASE } from "./models/glider";
import { flutterMaterial, sailPoint } from "./models/glider-sail";

/** Past 1 and back, so the wing snaps open with a little overshoot, like cloth catching the air. */
function backOut(t: number): number {
  const k = 1.9;
  const u = t - 1;
  return 1 + (k + 1) * u * u * u + k * u * u;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const TIP = sailPoint(1, 0.35);

/**
 * A kart's glider. The mast telescopes up out of the kart, the two
 * halves of the wing swing down from folded upright and stretch out to
 * full span, and the cloth ripples in the wind. Landing runs it all
 * backwards. It follows the engine's `glide`, which eases from 0 to 1 in
 * about 0.3 s, so every view shows the same moment.
 */
export class GliderView {
  readonly root = new THREE.Group();
  private readonly rig = new THREE.Group();
  private readonly mast: THREE.Mesh;
  private readonly halves: THREE.Group[] = [];
  private readonly sail = flutterMaterial();
  private readonly lit = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.35 });
  private readonly glow = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  private readonly materials = [this.sail, this.lit, this.glow];

  constructor(character: CharacterId) {
    const design = gliderDesign(character);
    this.mast = new THREE.Mesh(design.mast, this.lit);
    this.mast.position.set(...MAST_BASE);
    this.rig.add(new THREE.Mesh(design.keel, this.lit));
    for (const side of [1, -1]) {
      const half = new THREE.Group();
      half.add(new THREE.Mesh(design.sail, this.sail), new THREE.Mesh(design.spars, this.lit), new THREE.Mesh(design.tip, this.glow));
      half.userData.side = side;
      this.halves.push(half);
      this.rig.add(half);
    }
    this.root.add(this.mast, this.rig);
    this.root.visible = false;
  }

  /** Poses the glider for this frame from the kart's state. */
  update(kart: Kart, time: number): void {
    const open = kart.glide;
    this.root.visible = open > 0.002;
    if (!this.root.visible) return;
    // Opening snaps out past full and settles; folding just eases shut.
    const e = kart.gliding ? backOut(open) : smooth(open);
    const reach = Math.min(1, e);
    this.mast.scale.set(1, Math.max(0.05, e), Math.max(0.05, e));
    this.rig.position.set(0, lerp(MAST_BASE[1], GLIDER_TOP, e), lerp(MAST_BASE[2], 0.2, e) - 0.2);
    // A touch nose up, as a wing flies, and an extra lean into the turn over the kart's own bank.
    this.rig.rotation.set(-0.1 * reach, 0, kart.steer * 0.1 * reach, "YXZ");
    for (const half of this.halves) {
      const side = half.userData.side as number;
      half.rotation.z = side * lerp(1.4, 0.04, e);
      half.scale.set(side * lerp(0.22, 1, e), 1, lerp(0.55, 1, reach));
    }
    const pace = Math.min(1.3, speedOf(kart) / DRIVE.topSpeed);
    this.sail.userData.time.value = time;
    this.sail.userData.flutter.value = reach * (0.35 + 0.65 * pace) * (kart.airborne ? 1 : 0.4);
  }

  /** Fades with the kart, for Vanish and for a kart right in front of the camera. */
  setOpacity(opacity: number): void {
    const see = opacity < 0.999;
    for (const material of this.materials) {
      if (material.transparent !== see) {
        material.transparent = see;
        material.needsUpdate = true;
      }
      material.opacity = opacity;
    }
  }

  /** A wing tip in the world, `side` 1 or -1, for the vapour trails. */
  tipWorld(side: number, out: THREE.Vector3): THREE.Vector3 {
    const half = this.halves[side > 0 ? 0 : 1]!;
    return half.localToWorld(out.set(TIP.x, TIP.y, TIP.z));
  }

  dispose(): void {
    for (const material of this.materials) material.dispose();
  }
}
