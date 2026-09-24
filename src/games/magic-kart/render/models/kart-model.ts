import * as THREE from "three";
import type { CharacterId } from "../../characters";
import { kartDesign } from "./karts";

/**
 * One kart in a scene: body, glowing trim, a driver who leans into the
 * turns, and four wheels that steer and spin. The geometry is shared;
 * the materials are this kart's own, so it can fade out when it vanishes
 * without touching any other kart.
 */
export class KartModel {
  readonly root = new THREE.Group();
  /** Tilts with the ground and the air, under the heading. */
  readonly chassis = new THREE.Group();
  readonly driver = new THREE.Group();
  readonly lit: THREE.MeshStandardMaterial;
  readonly glow: THREE.MeshBasicMaterial;
  private readonly steerPivots: THREE.Group[] = [];
  private readonly spinners: { mesh: THREE.Mesh; radius: number; side: number }[] = [];
  private roll = 0;

  constructor(readonly character: CharacterId) {
    const design = kartDesign(character);
    this.lit = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.12 });
    this.glow = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    this.root.add(this.chassis);
    this.chassis.add(new THREE.Mesh(design.body, this.lit));
    if (design.glow) this.chassis.add(new THREE.Mesh(design.glow, this.glow));
    this.driver.position.set(...design.driverAt);
    this.driver.add(new THREE.Mesh(design.driver, this.lit));
    if (design.driverGlow) this.driver.add(new THREE.Mesh(design.driverGlow, this.glow));
    this.chassis.add(this.driver);
    for (const wheel of design.wheels) {
      const pivot = new THREE.Group();
      pivot.position.set(...wheel.at);
      const mesh = new THREE.Mesh(wheel.geometry, this.lit);
      const side = wheel.at[0] < 0 ? -1 : 1;
      // Wheels are built with the rim facing +x; the left ones turn round to face out.
      mesh.rotation.order = "YXZ";
      mesh.rotation.y = side < 0 ? Math.PI : 0;
      pivot.add(mesh);
      this.chassis.add(pivot);
      if (wheel.front) this.steerPivots.push(pivot);
      this.spinners.push({ mesh, radius: wheel.radius, side });
    }
    this.root.traverse((object) => {
      object.castShadow = false;
      object.receiveShadow = false;
    });
  }

  /**
   * Poses the kart for a frame: wheels roll by the distance covered,
   * front wheels and the driver follow the steering, and the body leans
   * out of corners and bobs a little at speed.
   */
  animate(speed: number, steer: number, dt: number, time: number, bounce = 1): void {
    for (const pivot of this.steerPivots) pivot.rotation.y = -steer * 0.45;
    // Left wheels are turned round, so the same roll needs the opposite sign.
    for (const wheel of this.spinners) wheel.mesh.rotation.x += ((speed * dt) / wheel.radius) * wheel.side;
    const targetRoll = steer * Math.min(1, Math.abs(speed) / 20) * 0.07;
    this.roll += (targetRoll - this.roll) * Math.min(1, dt * 8);
    this.chassis.rotation.z = this.roll;
    this.driver.rotation.z = this.roll * 1.5 + steer * 0.08;
    this.driver.rotation.y = -steer * 0.12;
    this.chassis.position.y = Math.sin(time * 23) * 0.012 * Math.min(1, Math.abs(speed) / 10) * bounce;
  }

  /** 1 is solid; lower fades the kart out, for Vanish. */
  setOpacity(opacity: number): void {
    const see = opacity < 0.999;
    for (const material of [this.lit, this.glow]) {
      if (material.transparent !== see) {
        material.transparent = see;
        material.needsUpdate = true;
      }
      material.opacity = opacity;
      // Still writing depth, so a faded kart shows its outside only, not the driver through the bodywork.
      material.depthWrite = true;
    }
  }

  /** A cold blue cast while the wheels are iced, a white flash while hit. */
  setTint(color: THREE.ColorRepresentation, amount: number): void {
    this.lit.emissive.set(color);
    this.lit.emissiveIntensity = amount;
  }

  dispose(): void {
    this.lit.dispose();
    this.glow.dispose();
  }
}
