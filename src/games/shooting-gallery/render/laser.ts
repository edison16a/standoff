import * as THREE from "three";
import { glowTexture } from "./textures";

let glow: THREE.Texture | null = null;
/** A unit tube from y 0 to y 1, stretched between the lens and the dot each frame. */
let tube: THREE.BufferGeometry | null = null;

/** The core is painted solid so it keeps the player's colour on a bright wall. The halo adds light round it. */
function beamMaterial(colour: THREE.Color, opacity: number, additive: boolean): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: colour,
    transparent: true,
    opacity,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: false,
    toneMapped: false,
  });
}

/**
 * A player's laser: a thin bright beam from the gun's lens to where it
 * lands, with a soft halo round it and a glowing dot at the end. The dot
 * sits exactly where a shot would strike, since both come from the same
 * probe of the booth.
 */
export class Laser {
  readonly object = new THREE.Group();
  private readonly core: THREE.Mesh;
  private readonly halo: THREE.Mesh;
  private readonly dot: THREE.Sprite;
  private readonly spot: THREE.Sprite;
  private readonly from = new THREE.Vector3();
  private readonly span = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);

  constructor(colour: string) {
    glow ??= glowTexture();
    tube ??= new THREE.CylinderGeometry(1, 1, 1, 8, 1, true).translate(0, 0.5, 0);
    const tint = new THREE.Color(colour);
    const bright = tint.clone().lerp(new THREE.Color("#ffffff"), 0.18);
    this.core = new THREE.Mesh(tube, beamMaterial(bright, 0.85, false));
    this.halo = new THREE.Mesh(tube, beamMaterial(tint, 0.3, true));
    this.dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: tint, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false }));
    this.spot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: "#ffffff", blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false }));
    // The dot is drawn over everything, like light landing on the surface.
    this.dot.renderOrder = this.spot.renderOrder = 5;
    for (const part of [this.core, this.halo, this.dot, this.spot]) part.frustumCulled = false;
    this.object.add(this.core, this.halo, this.dot, this.spot);
  }

  /** Stretches the beam from the lens to `target`, or hides it when there is no aim. */
  update(lens: THREE.Object3D, target: THREE.Vector3 | null, now: number): void {
    this.object.visible = target !== null;
    if (!target) return;
    lens.getWorldPosition(this.from);
    this.span.subVectors(target, this.from);
    const length = this.span.length();
    const direction = this.span.normalize();
    for (const [beam, radius] of [
      [this.core, 0.0032],
      [this.halo, 0.014],
    ] as const) {
      beam.position.copy(this.from);
      beam.quaternion.setFromUnitVectors(this.up, direction);
      beam.scale.set(radius, length, radius);
    }
    // A faint shimmer, as real laser pointers have.
    const shimmer = 0.9 + 0.1 * Math.sin(now * 37) * Math.sin(now * 13);
    this.dot.position.copy(target);
    this.dot.scale.setScalar(0.34 * shimmer);
    this.spot.position.copy(target);
    this.spot.scale.setScalar(0.075);
  }

  dispose(): void {
    for (const part of [this.core, this.halo, this.dot, this.spot]) (part.material as THREE.Material).dispose();
  }
}
