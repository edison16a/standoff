import * as THREE from "three";
import { beamGeometry, beamMaterial } from "./beam";

export interface StageLightsOptions {
  /** How many lamps, spaced round a ring. */
  count?: number;
  /** Their colours, round the ring in turn. Warm white by default. */
  colours?: readonly string[];
  /** The ring's radius and height, metres. */
  radius?: number;
  height?: number;
  /** Candela of each lamp. Scenes lit with physical units want tens to hundreds. */
  intensity?: number;
  /** Half angle of each cone, radians. */
  angle?: number;
  /** Draw the shafts of light through the haze. */
  beams?: boolean;
  /** How bright the shafts are. */
  beamStrength?: number;
  /** How far each lamp's aim wanders round the target, metres. 0 holds them still. */
  sweep?: number;
  /** Shadows from these lamps. Off by default, since each one costs a render. */
  shadows?: boolean;
}

interface Lamp {
  light: THREE.SpotLight;
  beam: THREE.Mesh;
  phase: number;
}

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Arena spotlights for a winner: lamps in a ring high overhead, every one
 * aimed at the same spot, with visible shafts through the haze. The aims
 * drift slowly round the spot so the light feels alive, and `focus`
 * slides them onto a new one. Add `object` to the scene and call
 * `update` each frame.
 */
export class StageLights {
  readonly object = new THREE.Group();
  readonly target = new THREE.Vector3();
  private readonly lamps: Lamp[] = [];
  private readonly want = new THREE.Vector3();
  private readonly options: Required<StageLightsOptions>;
  private readonly aim = new THREE.Vector3();
  private readonly tmp = new THREE.Vector3();

  constructor(options: StageLightsOptions = {}) {
    this.options = {
      count: 4,
      colours: ["#fff1d6"],
      radius: 5,
      height: 9,
      intensity: 260,
      angle: 0.22,
      beams: true,
      beamStrength: 0.3,
      sweep: 0.35,
      shadows: false,
      ...options,
    };
    const o = this.options;
    for (let k = 0; k < o.count; k++) {
      const colour = o.colours[k % o.colours.length]!;
      const a = (k / o.count) * Math.PI * 2 + Math.PI / 4;
      const light = new THREE.SpotLight(colour, o.intensity, 0, o.angle, 0.45, 2);
      light.position.set(Math.cos(a) * o.radius, o.height, Math.sin(a) * o.radius);
      light.castShadow = o.shadows;
      if (o.shadows) {
        light.shadow.mapSize.set(1024, 1024);
        light.shadow.bias = -0.0004;
      }
      this.object.add(light, light.target);
      const beam = new THREE.Mesh(beamGeometry(Math.tan(o.angle) * 0.9), beamMaterial(colour, o.beamStrength));
      beam.visible = o.beams;
      beam.renderOrder = 10;
      this.object.add(beam);
      this.lamps.push({ light, beam, phase: k * 1.7 });
    }
  }

  /** Snaps every lamp onto a spot at once. */
  aimAt(point: THREE.Vector3): void {
    this.target.copy(point);
    this.want.copy(point);
  }

  /** Slides every lamp's aim over to a new spot. */
  focus(point: THREE.Vector3): void {
    this.want.copy(point);
  }

  /** 0 dark to 1 full, for a fade up when the scene opens. */
  setLevel(level: number): void {
    for (const lamp of this.lamps) {
      lamp.light.intensity = this.options.intensity * level;
      (lamp.beam.material as THREE.ShaderMaterial).uniforms.strength!.value = this.options.beamStrength * level;
    }
  }

  update(time: number, dt: number): void {
    this.target.lerp(this.want, 1 - Math.exp(-dt * 3));
    const sweep = this.options.sweep;
    for (const lamp of this.lamps) {
      const t = time * 0.45 + lamp.phase;
      this.aim.set(this.target.x + Math.sin(t) * sweep, this.target.y, this.target.z + Math.cos(t * 0.8) * sweep);
      lamp.light.target.position.copy(this.aim);
      lamp.light.target.updateMatrixWorld();
      // The shaft runs from the lamp to the floor under its aim.
      const from = lamp.light.position;
      const along = this.tmp.copy(this.aim).sub(from);
      const length = along.length();
      lamp.beam.position.copy(from);
      lamp.beam.quaternion.setFromUnitVectors(UP, along.normalize().negate());
      lamp.beam.scale.set(length, length, length);
    }
  }

  dispose(): void {
    for (const lamp of this.lamps) {
      lamp.beam.geometry.dispose();
      (lamp.beam.material as THREE.Material).dispose();
      lamp.light.dispose();
    }
  }
}
