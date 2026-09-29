import * as THREE from "three";
import { beamMaterial } from "./beam";

export interface SpotOptions {
  /** Where the lamp hangs. */
  from: THREE.Vector3Like;
  /** What it points at. Move it later with `aim`. */
  at: THREE.Vector3Like;
  colour?: THREE.ColorRepresentation;
  /** Candela, three.js physical units. 400 lights a person well from 8 metres. */
  intensity?: number;
  /** Half the cone's angle, in radians. */
  angle?: number;
  penumbra?: number;
  /** Draw the light's shaft through hazy air. On by default. */
  beam?: boolean;
  /** How strong the shaft reads, 0 to 1. */
  haze?: number;
  shadows?: boolean;
  /**
   * Sway the lamp round its target, as an operator working a follow
   * spot: how far in metres, and how fast. Off by default.
   */
  sway?: { radius: number; speed: number };
}

interface Spot {
  light: THREE.SpotLight;
  beam: THREE.Mesh | null;
  base: THREE.Vector3;
  sway: { radius: number; speed: number } | null;
  phase: number;
}

/**
 * Concert style stage lighting for a victory scene: spotlights that
 * follow the winner, each with a soft visible shaft through the haze,
 * and an optional slow sway. Add `group` to the scene, then aim and
 * update every frame.
 *
 *   const lights = new StageLights();
 *   lights.addSpot({ from: { x: -4, y: 9, z: 4 }, at: { x: 0, y: 0, z: 0 }, colour: "#fff2d6" });
 *   lights.follow(winner.position);     // every spot keeps on the winner
 *   lights.update(dt, time);
 */
export class StageLights {
  readonly group = new THREE.Group();
  private readonly spots: Spot[] = [];
  private readonly tmp = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);

  addSpot(options: SpotOptions): THREE.SpotLight {
    const light = new THREE.SpotLight(options.colour ?? "#fff4dc", options.intensity ?? 400, 0, options.angle ?? 0.22, options.penumbra ?? 0.45, 2);
    light.position.copy(options.from);
    light.target.position.copy(options.at);
    if (options.shadows) {
      light.castShadow = true;
      light.shadow.mapSize.set(1024, 1024);
      light.shadow.bias = -0.0004;
    }
    this.group.add(light, light.target);
    let beam: THREE.Mesh | null = null;
    if (options.beam !== false) {
      // A unit cone, tip at the lamp, stretched each frame to reach the target.
      const geometry = new THREE.ConeGeometry(1, 1, 40, 1, true);
      geometry.translate(0, -0.5, 0);
      beam = new THREE.Mesh(geometry, beamMaterial(options.colour ?? "#fff4dc", options.haze ?? 0.5));
      beam.renderOrder = 10;
      beam.frustumCulled = false;
      this.group.add(beam);
    }
    const spot: Spot = { light, beam, base: new THREE.Vector3().copy(options.at), sway: options.sway ?? null, phase: this.spots.length * 1.9 };
    this.spots.push(spot);
    this.place(spot);
    return light;
  }

  /** Every spot aims at this point from now on, as a follow spot on the winner. */
  follow(point: THREE.Vector3Like): void {
    for (const spot of this.spots) spot.base.copy(point);
  }

  /** One spot, by the order they were added, aims at this point. */
  aim(index: number, point: THREE.Vector3Like): void {
    this.spots[index]?.base.copy(point);
  }

  /** Dims or brightens every spot at once, 0 to 1, for a fade up at the start of the scene. */
  setLevel(level: number, intensity = 400): void {
    for (const spot of this.spots) {
      spot.light.intensity = intensity * level;
      if (spot.beam) (spot.beam.material as THREE.ShaderMaterial).uniforms.level!.value = level;
    }
  }

  update(_dt: number, time: number): void {
    for (const spot of this.spots) {
      const target = spot.light.target.position.copy(spot.base);
      if (spot.sway) {
        const t = time * spot.sway.speed + spot.phase;
        target.x += Math.cos(t) * spot.sway.radius;
        target.z += Math.sin(t * 1.3) * spot.sway.radius;
      }
      this.place(spot);
    }
  }

  dispose(): void {
    for (const spot of this.spots) {
      spot.light.dispose();
      spot.beam?.geometry.dispose();
      (spot.beam?.material as THREE.Material | undefined)?.dispose();
    }
  }

  /** Stretches a spot's shaft from its lamp to the floor at its target, as wide as its cone. */
  private place(spot: Spot): void {
    spot.light.target.updateMatrixWorld();
    if (!spot.beam) return;
    const from = spot.light.position;
    const direction = this.tmp.copy(spot.light.target.position).sub(from);
    const length = direction.length();
    spot.beam.position.copy(from);
    spot.beam.quaternion.setFromUnitVectors(this.up, direction.normalize().negate());
    const radius = Math.tan(spot.light.angle) * length;
    spot.beam.scale.set(radius, length, radius);
  }
}
