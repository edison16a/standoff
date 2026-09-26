import * as THREE from "three";
import type { Piece } from "../../engine/arena";
import { LIGHT } from "../palette";
import { GROUND, turfTexture } from "../textures";
import { buildCover } from "./bunkers";
import { buildNetting } from "./netting";
import { buildScenery, SUN_DIR } from "./scenery";
import { Stands } from "./stands";

/**
 * The whole arena: the turf, the bunkers from the engine's own layout,
 * the nets, the stands and the pits, the scenery and the late afternoon
 * light. Built once per renderer; only the fans move.
 */
export class Arena {
  readonly group = new THREE.Group();
  readonly stands = new Stands();
  readonly sun: THREE.DirectionalLight;
  private readonly disposers: (() => void)[] = [];

  constructor(pieces: readonly Piece[]) {
    const turf = turfTexture();
    const turfMat = new THREE.MeshStandardMaterial({ map: turf, roughness: 0.95, metalness: 0 });
    const turfGeo = new THREE.PlaneGeometry(GROUND.halfWidth * 2, GROUND.halfLength * 2);
    const floor = new THREE.Mesh(turfGeo, turfMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.disposers.push(() => {
      turf.dispose();
      turfMat.dispose();
      turfGeo.dispose();
    });

    const cover = buildCover(pieces);
    this.disposers.push(() => cover.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    }));
    const netting = buildNetting();
    const scenery = buildScenery();
    this.disposers.push(netting.dispose, scenery.dispose, () => this.stands.dispose());

    const hemi = new THREE.HemisphereLight(LIGHT.sky, LIGHT.ground, 1.35);
    this.sun = new THREE.DirectionalLight(LIGHT.sun, 2.6);
    this.sun.position.copy(SUN_DIR).multiplyScalar(60);
    this.sun.castShadow = true;
    const cam = this.sun.shadow.camera;
    // The shadow covers the field and its margins, no more, so it stays sharp.
    cam.left = -36;
    cam.right = 36;
    cam.top = 36;
    cam.bottom = -36;
    cam.near = 10;
    cam.far = 140;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.03;
    this.group.add(scenery.group, floor, cover, netting.group, this.stands.group, hemi, this.sun, this.sun.target);
  }

  update(time: number, dt: number): void {
    this.stands.update(time, dt);
  }

  dispose(): void {
    for (const d of this.disposers) d();
  }
}
