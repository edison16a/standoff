import * as THREE from "three";
import type { CharacterId } from "../../characters";
import { poseDriver } from "./driver-pose";
import { SuspensionMotion } from "./kart-motion";
import { farCut, kartDesign } from "./karts";
import { kartAtlas } from "./kit/atlas";
import { kartMaterial, type KartMaterial } from "./kit/kart-material";
import { makeSkeleton, type BoneName } from "./parts/driver-rig";

/** What a kart is doing this frame, for posing it. */
export interface KartPose {
  /** Forward speed, m/s, negative in reverse. */
  speed: number;
  steer: number;
  /** Heading turn rate, rad/s, positive to the left. */
  yawRate: number;
  vy: number;
  airborne: boolean;
  /** Drift direction: 1 right, -1 left, 0 none. */
  drift: number;
  /** 0 to 1. */
  brake: number;
  /** 0 to 1, heats the exhausts. */
  boost: number;
  /** 0 smooth road to 1 rough ground. */
  rough: number;
}

/** A kart sitting still with the wheel turned, for the turntable and the podium. */
export const idlePose = (steer: number, speed = 0): KartPose => ({ speed, steer, yawRate: 0, vy: 0, airborne: false, drift: 0, brake: 0, boost: 0, rough: 0 });

/**
 * One kart in a scene. The chassis carries the wheels, which steer and
 * spin; the body rides on springs above them, rolling, pitching and
 * bouncing with the driving; and the driver, a skinned mesh, holds the
 * steering wheel and turns it, arms bending to follow. Geometry is shared;
 * the material is this kart's own, so it can fade and glow by itself.
 */
export class KartModel {
  readonly root = new THREE.Group();
  /** Follows the ground under the heading. The wheels hang from it. */
  readonly chassis = new THREE.Group();
  /** The sprung body: bodywork, driver and anything riding on them. */
  readonly body = new THREE.Group();
  readonly material: KartMaterial;
  private readonly bones: Record<BoneName, THREE.Bone>;
  private readonly steerPivots: { pivot: THREE.Group; side: number }[] = [];
  private readonly spinners: { spin: THREE.Group; radius: number; side: number }[] = [];
  /** The full and the coarse meshes, one of each pair shown at a time. */
  private readonly near: THREE.Object3D[] = [];
  private readonly far: THREE.Object3D[] = [];
  private readonly motion = new SuspensionMotion();
  private driftLean = 0;
  private heat = 0;

  /** `far` also builds the coarse cut, for races where karts are seen from afar. */
  constructor(readonly character: CharacterId, far = false) {
    const design = kartDesign(character);
    this.material = kartMaterial(kartAtlas());
    this.root.add(this.chassis);
    this.chassis.add(this.body);
    const { bones, skeleton } = makeSkeleton(design.rig);
    this.bones = bones;
    const coarse = far ? farCut(character) : null;
    this.pair(new THREE.Mesh(design.body, this.material), coarse && new THREE.Mesh(coarse.body, this.material), this.body);
    // Both drivers follow the one skeleton, so either can be shown without posing twice.
    const driver = this.driverMesh(design.driver, skeleton, design.driverAt);
    driver.add(bones.root);
    this.pair(driver, coarse && this.driverMesh(coarse.driver, skeleton, design.driverAt), this.body);
    design.wheels.forEach((wheel, i) => {
      const pivot = new THREE.Group();
      pivot.position.set(...wheel.at);
      const spin = new THREE.Group();
      const side = wheel.at[0] < 0 ? -1 : 1;
      // Wheels are built with the rim facing +x; the left ones turn round to face out.
      spin.rotation.order = "YXZ";
      spin.rotation.y = side < 0 ? Math.PI : 0;
      const rough = coarse?.wheels[i];
      this.pair(new THREE.Mesh(wheel.geometry, this.material), rough && new THREE.Mesh(rough, this.material), spin);
      pivot.add(spin);
      this.chassis.add(pivot);
      if (wheel.front) this.steerPivots.push({ pivot, side });
      this.spinners.push({ spin, radius: wheel.radius, side });
    });
    this.setFar(false);
  }

  private driverMesh(geometry: THREE.BufferGeometry, skeleton: THREE.Skeleton, at: readonly [number, number, number]): THREE.SkinnedMesh {
    const mesh = new THREE.SkinnedMesh(geometry, this.material);
    mesh.bind(skeleton, new THREE.Matrix4());
    // The pose never strays far from rest, so the rest bounds, padded, do for culling.
    mesh.boundingSphere = geometry.boundingSphere!.clone();
    mesh.boundingSphere.radius *= 1.25;
    mesh.position.set(...at);
    return mesh;
  }

  private pair(near: THREE.Object3D, far: THREE.Object3D | null | undefined, parent: THREE.Object3D): void {
    parent.add(near);
    this.near.push(near);
    if (!far) return;
    parent.add(far);
    this.far.push(far);
  }

  /** Shows the coarse cut, for a kart far from the camera drawing this view. */
  setFar(far: boolean): void {
    if (this.far.length === 0) return;
    for (const o of this.near) o.visible = !far;
    for (const o of this.far) o.visible = far;
  }

  /** Poses the kart for a frame. */
  animate(dt: number, time: number, pose: KartPose): void {
    // The inside wheel turns a little more than the outside one, as real steering geometry does.
    for (const { pivot, side } of this.steerPivots) {
      const inside = pose.steer * side < 0;
      pivot.rotation.y = -pose.steer * 0.42 * (inside ? 1.1 : 0.9);
    }
    // Left wheels are turned round, so the same roll needs the opposite sign.
    for (const wheel of this.spinners) wheel.spin.rotation.x += ((pose.speed * dt) / wheel.radius) * wheel.side;
    this.motion.step({ dt, speed: pose.speed, yawRate: pose.yawRate, vy: pose.vy, airborne: pose.airborne, rough: pose.rough, time });
    this.driftLean += (-pose.drift * 0.045 - this.driftLean) * Math.min(1, dt * 6);
    const roll = this.motion.roll + this.driftLean;
    this.body.rotation.set(this.motion.pitch, 0, roll);
    this.body.position.y = this.motion.heave;
    poseDriver(kartDesign(this.character).rig, this.bones, { steer: pose.steer, roll, brake: pose.brake, boost: pose.boost });
    // Exhausts glow up fast on boost and cool off slowly; brake lights flare while braking.
    this.heat += (pose.boost - this.heat) * Math.min(1, dt * (pose.boost > this.heat ? 12 : 1.5));
    this.material.userData.heat.value = this.heat * (0.8 + 0.2 * Math.sin(time * 40));
    this.material.userData.brake.value = 0.35 + 0.65 * Math.min(1, pose.brake);
  }

  /** What the paint and chrome reflect: the map's own sky, or a studio. */
  setEnvironment(texture: THREE.Texture | null, intensity = 1): void {
    if (this.material.envMap !== texture) {
      this.material.envMap = texture;
      this.material.needsUpdate = true;
    }
    this.material.envMapIntensity = intensity;
  }

  /** Headlamp brightness, brighter on night maps. */
  setHeadlamps(level: number): void {
    this.material.userData.head.value = level;
  }

  /** 1 is solid; lower fades the kart out, for Vanish. */
  setOpacity(opacity: number): void {
    const see = opacity < 0.999;
    if (this.material.transparent !== see) {
      this.material.transparent = see;
      this.material.needsUpdate = true;
    }
    this.material.opacity = opacity;
    // Sticker edges are cut where the texture is clear; scaled with the fade so a faded kart is not cut away whole.
    this.material.alphaTest = Math.min(0.5, opacity * 0.5);
    // Still writing depth, so a faded kart shows its outside only, not the driver through the bodywork.
    this.material.depthWrite = true;
  }

  /** A cold blue cast while the wheels are iced, a white flash while hit. */
  setTint(color: THREE.ColorRepresentation, amount: number): void {
    this.material.emissive.set(color);
    this.material.emissiveIntensity = amount;
  }

  dispose(): void {
    this.material.dispose();
  }
}
