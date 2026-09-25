import * as THREE from "three";
import type { StageDef, StageId } from "../../engine/stages";
import { buildCave } from "./cave";
import { buildDojo } from "./dojo";
import { buildForest } from "./forest";
import type { Lighting, SceneryKit } from "./kit";
import { buildSky, type SkyLook } from "./sky";
import { buildTemple } from "./temple";

/** What each stage's builder hands back. */
export interface StageBuild {
  kit: SceneryKit;
  lighting: Lighting;
  sky: SkyLook;
}

const BUILDERS: Record<StageId, (stage: StageDef) => StageBuild> = {
  "dojo-rooftop": buildDojo,
  "floating-temple": buildTemple,
  "crystal-cave": buildCave,
  "forest-treetop": buildForest,
};

/**
 * A whole stage ready to draw: its scenery, its sky, and lights and fog
 * to match. The platforms sit exactly where the engine's surfaces are.
 */
export class StageScene {
  readonly group = new THREE.Group();
  readonly sky: THREE.Mesh;
  readonly fog: THREE.Fog;
  private readonly kit: SceneryKit;

  constructor(stage: StageDef) {
    const build = BUILDERS[stage.id](stage);
    const l = build.lighting;
    this.kit = build.kit;
    this.sky = buildSky(build.sky);
    this.fog = new THREE.Fog(l.fog, l.fogNear, l.fogFar);
    const hemi = new THREE.HemisphereLight(l.sky, l.ground, l.hemi);
    const key = new THREE.DirectionalLight(l.key, l.keyPower);
    key.position.set(...l.keyFrom);
    const rim = new THREE.DirectionalLight(l.rim, l.rimPower);
    rim.position.set(-l.keyFrom[0], l.keyFrom[1] * 0.6, -10);
    this.group.add(this.kit.group, this.sky, hemi, key, rim);
  }

  update(time: number, dt: number, eye: THREE.Vector3): void {
    this.sky.position.copy(eye);
    this.kit.update(time, dt);
  }

  dispose(): void {
    this.kit.dispose();
    this.sky.geometry.dispose();
    (this.sky.material as THREE.Material).dispose();
  }
}
