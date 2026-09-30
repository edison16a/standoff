import * as THREE from "three";

/**
 * Hard film lighting for the trailer and the stills, over the field's
 * own sunny day: the sky's soft fill turned down so shadows go deep, a
 * hot rim from behind the subject that outlines masks and shoulders,
 * and a warm key from the camera's side. Both follow the camera. The
 * page grades the picture on top.
 */
export class FilmLights {
  // Its reach ends just past the subject, so it never pools on the grass between them and the lens.
  private readonly rim = new THREE.SpotLight("#fff1d6", 1500, 9.5, 0.45, 0.5, 1.5);
  private readonly key = new THREE.DirectionalLight("#ffd2a0", 0.8);
  private readonly dimmed: { light: THREE.Light; was: number }[] = [];
  private readonly back = new THREE.Vector3();
  private readonly side = new THREE.Vector3();
  private readonly envWas: number;

  constructor(private readonly scene: THREE.Scene) {
    scene.traverse((o) => {
      const share = o instanceof THREE.HemisphereLight ? 0.45 : o instanceof THREE.DirectionalLight ? 0.8 : 1;
      if (o instanceof THREE.Light && share < 1) {
        this.dimmed.push({ light: o, was: o.intensity });
        o.intensity *= share;
      }
    });
    this.envWas = scene.environmentIntensity;
    scene.environmentIntensity *= 0.5;
    scene.add(this.rim, this.rim.target, this.key, this.key.target);
  }

  /** Places the lights for a camera at `from` looking at `at`. */
  aim(from: THREE.Vector3, at: THREE.Vector3): void {
    this.back.subVectors(at, from).setY(0);
    if (this.back.lengthSq() < 1e-6) this.back.set(0, 0, 1);
    this.back.normalize();
    this.side.set(-this.back.z, 0, this.back.x);
    this.rim.position.copy(at).addScaledVector(this.back, 7).addScaledVector(this.side, 2.5).setY(at.y + 4.5);
    this.rim.target.position.copy(at).setY(at.y + 0.8);
    this.key.position.copy(from).addScaledVector(this.side, -3).setY(from.y + 3);
    this.key.target.position.copy(at);
  }

  dispose(): void {
    for (const d of this.dimmed) d.light.intensity = d.was;
    this.scene.environmentIntensity = this.envWas;
    this.scene.remove(this.rim, this.rim.target, this.key, this.key.target);
    this.rim.dispose();
    this.key.dispose();
  }
}
