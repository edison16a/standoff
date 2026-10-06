import * as THREE from "three";

/**
 * The arena's lighting rig, physically based. The key is the bank of
 * lamps over the court: high and nearly overhead, as in a real arena, so
 * each player's shadow pools soft round his feet and the ball's follows
 * it to the floor. Its shadow map covers only the court, where a texel
 * is about a centimetre. The fill is a weak sky and ground pair (cool
 * above, the maple's warm bounce below) under the environment map, and
 * a cool rim from behind the basket lifts the players off the stands.
 */
export class ArenaLights {
  readonly group = new THREE.Group();
  readonly key: THREE.DirectionalLight;
  readonly fill: THREE.HemisphereLight;
  readonly rim: THREE.DirectionalLight;

  constructor() {
    this.key = new THREE.DirectionalLight("#fff5e8", 3.1);
    this.key.position.set(3.5, 26, 11);
    this.key.target.position.set(0, 0, 5);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    const cam = this.key.shadow.camera;
    cam.left = -10.5;
    cam.right = 10.5;
    cam.top = 10;
    cam.bottom = -10;
    cam.near = 12;
    cam.far = 40;
    this.key.shadow.bias = -0.0003;
    this.key.shadow.normalBias = 0.025;
    // Soft edges, as from a bank of lamps rather than one point; three's PCF spreads its taps this many texels.
    this.key.shadow.radius = 4;
    this.fill = new THREE.HemisphereLight("#bcd0ff", "#7a5232", 0.35);
    this.rim = new THREE.DirectionalLight("#a9c8ff", 0.9);
    this.rim.position.set(-6, 10, -12);
    this.group.add(this.key, this.key.target, this.fill, this.rim);
  }
}
