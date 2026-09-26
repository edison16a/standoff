import * as THREE from "three";
import { glowTexture } from "../kit/textures";

/** How much brighter than white the flash and the ring are drawn: enough to glow, not enough to blind. */
const FLASH = 1.5;
const RING = 1.2;
const WHITE = new THREE.Color(1, 1, 1);

interface Pop {
  at: THREE.Vector3;
  born: number;
  lifeMs: number;
  size: number;
  colour: THREE.Color;
}

/**
 * The bright parts of a blow: a flash of light at the point of contact
 * and, for a hit, a thin shockwave ring racing out from it, turned to face
 * the camera. A clash gets a small quick flash under its sparks, the end
 * of the final hit's slow motion a big one.
 */
export class Impacts {
  readonly group = new THREE.Group();
  private readonly pops: { pop: Pop; flash: THREE.Sprite; ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial> }[] = [];
  private readonly ringGeometry = new THREE.RingGeometry(0.9, 1, 48);

  fire(at: THREE.Vector3, t: number, options: { size: number; lifeMs: number; colour: THREE.ColorRepresentation; ring?: boolean }): void {
    const colour = new THREE.Color(options.colour);
    const ringColour = colour.clone().multiplyScalar(RING);
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    const ring = new THREE.Mesh(this.ringGeometry, new THREE.MeshBasicMaterial({ color: ringColour, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    flash.renderOrder = 5;
    ring.renderOrder = 5;
    ring.visible = options.ring ?? true;
    this.group.add(flash, ring);
    this.pops.push({ pop: { at: at.clone(), born: t, lifeMs: options.lifeMs, size: options.size, colour }, flash, ring });
  }

  update(t: number): void {
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const { pop, flash, ring } = this.pops[i]!;
      const age = (t - pop.born) / pop.lifeMs;
      if (age >= 1 || age < 0) {
        this.group.remove(flash, ring);
        flash.material.dispose();
        ring.material.dispose();
        this.pops.splice(i, 1);
        continue;
      }
      const ease = 1 - (1 - age) ** 3;
      flash.position.copy(pop.at);
      flash.scale.setScalar(pop.size * (0.6 + ease * 0.8));
      flash.material.opacity = (1 - age) ** 2;
      // Only just past white, so the bloom gives it a halo without swallowing the fighters.
      flash.material.color.copy(pop.colour).lerp(WHITE, 1 - age).multiplyScalar(FLASH);
      ring.position.copy(pop.at);
      ring.scale.setScalar(0.05 + ease * pop.size * 1.3);
      ring.material.opacity = (1 - age) * 0.9;
    }
  }

  /** The rings are flat, so each view turns them to face its own camera. */
  face(camera: THREE.Camera): void {
    for (const { ring } of this.pops) ring.quaternion.copy(camera.quaternion);
  }

  clear(): void {
    for (const { flash, ring } of this.pops) {
      this.group.remove(flash, ring);
      flash.material.dispose();
      ring.material.dispose();
    }
    this.pops.length = 0;
  }

  dispose(): void {
    this.clear();
    this.ringGeometry.dispose();
  }
}
