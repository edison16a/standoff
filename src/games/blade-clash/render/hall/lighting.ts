import * as THREE from "three";
import { disposeOwned, MeshBuilder } from "../kit/mesh-builder";
import { glow, metal } from "../kit/materials";
import { beamTexture } from "../kit/textures";
import type { HallTheme } from "./hall-theme";

/** Where the spotlights hang along the strip, and how high. Only the middle two are real lights: every light costs every pixel. */
const SPOTS_X = [-5.4, -1.9, 1.9, 5.4];
const LIT = new Set([-1.9, 1.9]);
const RIG_HEIGHT = 8.4;

/**
 * The hall's lights. A follow spot above the fighters casts their shadows
 * and moves with the bout. Cool rim lights from behind outline them against
 * the stands. A row of spotlights down the strip makes pools of light, with
 * their beams showing in the evening haze. Daylight comes in from the
 * windows on the light theme.
 */
export class Lighting {
  readonly group = new THREE.Group();
  private readonly key: THREE.SpotLight;
  private readonly flash: THREE.PointLight;
  private flashLevel = 0;

  constructor(theme: HallTheme, quality: { shadows: boolean; shadowSize: number }) {
    this.group.add(new THREE.HemisphereLight(theme.sky, theme.ground, theme.hemisphere));

    this.key = new THREE.SpotLight(theme.key.color, theme.key.intensity, 30, 0.42, 0.65, 1.6);
    this.key.position.set(3.5, 9.5, 3.2);
    this.key.castShadow = quality.shadows;
    this.key.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.02;
    this.key.shadow.camera.near = 4;
    this.key.shadow.camera.far = 20;
    this.group.add(this.key, this.key.target);

    const rim = new THREE.DirectionalLight(theme.rim.color, theme.rim.intensity);
    rim.position.set(2, 5, -8);
    this.group.add(rim);
    if (theme.sun > 0) {
      const sun = new THREE.DirectionalLight(0xfff0d6, theme.sun);
      sun.position.set(-6, 12, -10);
      this.group.add(sun);
    }

    const fixtures = new MeshBuilder();
    const housing = metal(0x22252d, 0.4);
    const lens = glow(theme.spots.color, 5);
    const beam = new THREE.MeshBasicMaterial({
      map: beamTexture(), color: theme.spots.color, transparent: true, opacity: theme.spots.beam,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
    });
    for (const x of SPOTS_X) {
      if (LIT.has(x)) {
        const spot = new THREE.SpotLight(theme.spots.color, theme.spots.intensity, 16, 0.34, 0.7, 1.4);
        spot.position.set(x, RIG_HEIGHT, 0.6);
        spot.target.position.set(x, 0, 0);
        this.group.add(spot, spot.target);
      }
      fixtures.cylinder(0.2, 0.26, 0.5, housing, [x, RIG_HEIGHT + 0.25, 0.6], [0, 0, 0], 16);
      fixtures.cylinder(0.2, 0.2, 0.02, lens, [x, RIG_HEIGHT - 0.01, 0.6], [0, 0, 0], 16);
      // The beam: a cone of light widening down to the strip.
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 2.4, RIG_HEIGHT - 0.1, 24, 1, true), beam);
      cone.position.set(x, (RIG_HEIGHT - 0.1) / 2, 0.3);
      cone.renderOrder = 2;
      this.group.add(cone);
    }
    this.group.add(fixtures.build("fixtures", false));

    // A burst of light for the moment a touch lands.
    this.flash = new THREE.PointLight(0xfff2d0, 0, 9, 2);
    this.group.add(this.flash);
  }

  /** Keeps the follow spot on the action. */
  follow(x: number): void {
    this.key.position.x = x + 3.5;
    this.key.target.position.set(x, 0.9, 0);
  }

  /** A white flash from the point of contact. */
  burst(at: THREE.Vector3, strength = 1): void {
    this.flash.position.copy(at).add(new THREE.Vector3(0, 0.3, 1.1));
    this.flashLevel = strength;
  }

  update(dtMs: number): void {
    this.flashLevel *= Math.exp(-dtMs / 160);
    // Enough to lift the fighters for a moment, never enough to wash them out.
    this.flash.intensity = this.flashLevel * 14;
  }

  dispose(): void {
    this.key.shadow.map?.dispose();
    disposeOwned(this.group);
  }
}
