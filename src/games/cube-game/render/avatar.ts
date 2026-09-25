import * as THREE from "three";
import type { PlayerState } from "../engine/player";
import type { Mode } from "../engine/types";
import { ballSkin, cubeFace, glowSprite } from "./textures";

export interface Skin {
  main: number;
  trim: number;
}

function faceMaterial(skin: Skin): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: cubeFace(skin.main, skin.trim, false),
    emissiveMap: cubeFace(skin.main, skin.trim, true),
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.55,
    roughness: 0.35,
    metalness: 0.15,
  });
}

/**
 * One player's avatar in all three forms. The cube has the classic face;
 * the UFO is a saucer with the cube riding under a glass dome; the ball
 * is striped so its roll shows. A ghost copy draws the rival faintly in
 * the other player's half of the split screen.
 */
export class Avatar {
  readonly group = new THREE.Group();
  private readonly forms: Record<Mode, THREE.Object3D>;
  private readonly materials: THREE.Material[] = [];
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly halo: THREE.Sprite;
  private squash = 0;
  private mode: Mode | null = null;

  constructor(skin: Skin, ghost = false) {
    const face = faceMaterial(skin);
    const box = new THREE.BoxGeometry(0.92, 0.92, 0.92);
    const cube = new THREE.Mesh(box, face);

    const ufo = new THREE.Group();
    const saucerGeometry = new THREE.SphereGeometry(0.72, 32, 12);
    saucerGeometry.scale(1, 0.3, 1);
    const hull = new THREE.MeshStandardMaterial({ color: skin.main, roughness: 0.3, metalness: 0.6, emissive: skin.main, emissiveIntensity: 0.25 });
    const rimGeometry = new THREE.TorusGeometry(0.72, 0.05, 8, 40);
    rimGeometry.rotateX(Math.PI / 2);
    const rim = new THREE.MeshBasicMaterial({ color: new THREE.Color(skin.trim).multiplyScalar(2.4) });
    const domeGeometry = new THREE.SphereGeometry(0.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const glass = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.2 });
    const rider = new THREE.Mesh(box, face);
    rider.scale.setScalar(0.42);
    rider.position.y = 0.12;
    const saucer = new THREE.Mesh(saucerGeometry, hull);
    saucer.position.y = -0.08;
    const band = new THREE.Mesh(rimGeometry, rim);
    band.position.y = -0.08;
    const dome = new THREE.Mesh(domeGeometry, glass);
    dome.position.y = 0;
    ufo.add(saucer, band, rider, dome);

    const skinMap = ballSkin(skin.main, skin.trim);
    const ballMaterial = new THREE.MeshStandardMaterial({ map: skinMap, emissiveMap: skinMap, emissive: 0xffffff, emissiveIntensity: 1.1, roughness: 0.4 });
    const sphere = new THREE.SphereGeometry(0.46, 32, 20);
    const ball = new THREE.Mesh(sphere, ballMaterial);

    this.forms = { cube, ufo, ball };
    this.halo = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowSprite(), color: skin.trim, transparent: true, opacity: ghost ? 0.12 : 0.28, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.halo.scale.setScalar(2.2);
    this.group.add(cube, ufo, ball, this.halo);
    this.materials.push(face, hull, rim, glass, ballMaterial, this.halo.material);
    this.geometries.push(box, saucerGeometry, rimGeometry, domeGeometry, sphere);
    if (ghost) {
      for (const material of this.materials) {
        material.transparent = true;
        material.opacity = Math.min(material.opacity, 0.32);
        material.depthWrite = false;
      }
    }
  }

  /** A squash on landing, springing back over a few frames. */
  land(): void {
    this.squash = 1;
  }

  update(state: PlayerState | null, dt: number): void {
    this.group.visible = !!state && !state.dead;
    if (!state || state.dead) return;
    if (state.mode !== this.mode) {
      this.mode = state.mode;
      for (const [mode, form] of Object.entries(this.forms)) form.visible = mode === state.mode;
    }
    this.group.position.set(state.x, state.y, 0);
    const form = this.forms[state.mode];
    form.rotation.z = state.angle;
    this.squash = Math.max(0, this.squash - dt * 6);
    const s = this.squash * this.squash;
    // The squash is along gravity, so a ball on the ceiling flattens upward.
    form.scale.set(1 + s * 0.16, 1 - s * 0.22, 1 + s * 0.16);
    form.position.y = -s * 0.1 * state.gravity;
  }

  dispose(): void {
    for (const material of this.materials) {
      const textured = material as THREE.MeshStandardMaterial;
      textured.map?.dispose();
      textured.emissiveMap?.dispose();
      material.dispose();
    }
    for (const geometry of this.geometries) geometry.dispose();
  }
}
