import * as THREE from "three";

/**
 * A hard side light for the showcase only: a hot spot off to one side and
 * a little behind the boxers, placed from whichever camera is drawing, so
 * every face is half lit and half in shadow against the dark arena, like
 * a fight poster rather than the arena's even ring light.
 */
export class Kicker {
  readonly light = new THREE.SpotLight("#ffe2b8", 110, 14, 0.5, 0.6, 1.4);
  private readonly target = new THREE.Vector3();
  private readonly back = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    scene.add(this.light, this.light.target);
    // Less fill from the sky light and the corner rims, so the shadow side of each face falls away into the dark.
    scene.traverse((thing) => {
      if (thing instanceof THREE.HemisphereLight) thing.intensity *= 0.4;
      if (thing instanceof THREE.DirectionalLight) thing.intensity *= 0.6;
    });
  }

  /** Puts the light to the side of `subject` as seen from `camera`, above it and a little behind. */
  aim(camera: THREE.Camera, subject: THREE.Vector3): void {
    this.target.copy(subject);
    this.back.copy(subject).sub(camera.position).setY(0).normalize();
    this.light.position.set(subject.x + this.back.x * 1.4 - this.back.z * 3, subject.y + 1.8, subject.z + this.back.z * 1.4 + this.back.x * 3);
    this.light.target.position.copy(this.target);
    this.light.target.updateMatrixWorld();
  }
}
