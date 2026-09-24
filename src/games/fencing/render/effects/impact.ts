import * as THREE from "three";
import { glowTexture } from "../kit/textures";
import { GLOW } from "./glow";

interface Pop {
  at: THREE.Vector3;
  born: number;
  lifeMs: number;
  size: number;
  colour: THREE.Color;
}

/**
 * The bright parts of a hit: a flash of light at the point of contact and a
 * shockwave ring that races out from it, turned to face the camera. A
 * parry gets a small quick one, the end of a touch's slow motion a big one.
 */
export class Impacts {
  readonly group = new THREE.Group();
  private readonly pops: { pop: Pop; flash: THREE.Sprite; ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial> }[] = [];
  private readonly ringGeometry = new THREE.RingGeometry(0.82, 1, 48);

  fire(at: THREE.Vector3, t: number, options: { size: number; lifeMs: number; colour: THREE.ColorRepresentation }): void {
    const colour = new THREE.Color(options.colour);
    const ringColour = colour.clone().multiplyScalar(GLOW * 0.6);
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    const ring = new THREE.Mesh(this.ringGeometry, new THREE.MeshBasicMaterial({ color: ringColour, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    flash.renderOrder = 5;
    ring.renderOrder = 5;
    this.group.add(flash, ring);
    this.pops.push({ pop: { at: at.clone(), born: t, lifeMs: options.lifeMs, size: options.size, colour }, flash, ring });
  }

  update(t: number, camera: THREE.Camera): void {
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
      flash.material.color.copy(pop.colour).lerp(new THREE.Color(1, 1, 1), 1 - age).multiplyScalar(GLOW);
      ring.position.copy(pop.at);
      ring.quaternion.copy(camera.quaternion);
      ring.scale.setScalar(0.05 + ease * pop.size * 1.3);
      ring.material.opacity = (1 - age) * 0.9;
    }
  }

  hideRings(): void {
    for (const { ring } of this.pops) ring.visible = false;
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
