import * as THREE from "three";

/**
 * Hard film lighting for the trailer and the stills, laid over the
 * stadium's own: the sky fill turned right down, a strong cold rim from
 * behind the subject that outlines helmets and shoulders, and a warm
 * key from the camera's side. Both follow the camera, so every shot is
 * lit like a poster whichever way it looks. The page grades the picture
 * on top.
 */
/** The warm key's strength in the film. A still may scale it. */
const KEY = 0.9;

export class FilmLights {
  // Its reach ends just past the subject, so it never pools on the turf between them and the lens.
  private readonly rim = new THREE.SpotLight("#cfe0ff", 1700, 9.5, 0.42, 0.5, 1.5);
  // A spot from the camera's side would pool on the turf in front of the lens, so the key is a directional light.
  private readonly key = new THREE.DirectionalLight("#ffc590", KEY);
  private readonly dimmed: { light: THREE.Light; was: number }[] = [];
  private readonly back = new THREE.Vector3();
  private readonly envWas: number;

  constructor(private readonly scene: THREE.Scene) {
    // The stadium's even fill flattens faces; a darker sky fill and a softer overhead light read as night drama.
    scene.traverse((o) => {
      const share = o instanceof THREE.HemisphereLight ? 0.3 : o instanceof THREE.DirectionalLight ? 0.6 : 1;
      if (o instanceof THREE.Light && share < 1) {
        this.dimmed.push({ light: o, was: o.intensity });
        o.intensity *= share;
      }
    });
    this.envWas = scene.environmentIntensity;
    scene.environmentIntensity *= 0.5;
    scene.add(this.rim, this.rim.target, this.key, this.key.target);
  }

  /** Scales the warm key, so a still can light the hero's front brighter than the film does. */
  setKey(scale: number): void {
    this.key.intensity = KEY * scale;
  }

  /** Places the lights for a camera at `pos` looking at `look`. */
  aim(pos: THREE.Vector3, look: THREE.Vector3): void {
    this.back.subVectors(look, pos).setY(0);
    if (this.back.lengthSq() < 1e-6) this.back.set(1, 0, 0);
    this.back.normalize();
    const side = new THREE.Vector3(-this.back.z, 0, this.back.x);
    // Behind the subject, a little to one side and high, like a stadium light over the far stand.
    this.rim.position.copy(look).addScaledVector(this.back, 7).addScaledVector(side, 2.5).setY(look.y + 4.5);
    // Aimed over the subject's head, so the cone rakes across the bodies and not the turf in front of them.
    this.rim.target.position.copy(look).setY(look.y + 0.8);
    // From the camera's side and above: warm on the face, falling away fast.
    this.key.position.copy(pos).addScaledVector(side, -3).setY(pos.y + 3);
    this.key.target.position.copy(look);
  }

  dispose(): void {
    for (const d of this.dimmed) d.light.intensity = d.was;
    this.scene.environmentIntensity = this.envWas;
    this.scene.remove(this.rim, this.rim.target, this.key, this.key.target);
    this.rim.dispose();
    this.key.dispose();
  }
}
