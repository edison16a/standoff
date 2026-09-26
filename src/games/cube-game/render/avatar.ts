import * as THREE from "three";
import type { PlayerState } from "../engine/player";
import type { Mode } from "../engine/types";
import { ballSkin, cubeFace, glowSprite } from "./textures";

/** The dark outline every form wears, as the original's icons do, so it reads against any sky. */
const OUTLINE = 0x0a0418;
/**
 * A ghost runs a little behind the play, so where it overlaps the view's
 * own avatar the solid one hides it. Level with it, the see through ghost
 * blended over the solid faces and washed out their colours.
 */
const GHOST_Z = -0.4;

export interface Skin {
  main: number;
  trim: number;
}

function faceMaterial(skin: Skin): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: cubeFace(skin.main, skin.trim, false),
    emissiveMap: cubeFace(skin.main, skin.trim, true),
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.35,
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
  /** Holds the forms and takes the landing squash, so it stays along gravity while the form inside turns. */
  private readonly body = new THREE.Group();
  private readonly forms: Record<Mode, THREE.Object3D>;
  private readonly materials: THREE.Material[] = [];
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly halo: THREE.Sprite;
  private squash = 0;
  private mode: Mode | null = null;
  private readonly z: number;

  constructor(skin: Skin, ghost = false) {
    this.z = ghost ? GHOST_Z : 0;
    const face = faceMaterial(skin);
    const box = new THREE.BoxGeometry(0.92, 0.92, 0.92);
    const cube = new THREE.Mesh(box, face);

    const ufo = new THREE.Group();
    const saucerGeometry = new THREE.SphereGeometry(0.72, 32, 12);
    saucerGeometry.scale(1, 0.36, 1);
    // Only a faint glow, so bloom keeps the hull's shape instead of washing it into a bright line.
    const hull = new THREE.MeshStandardMaterial({ color: skin.main, roughness: 0.3, metalness: 0.5, emissive: skin.main, emissiveIntensity: 0.1 });
    const rimGeometry = new THREE.TorusGeometry(0.72, 0.05, 8, 40);
    rimGeometry.rotateX(Math.PI / 2);
    const rim = new THREE.MeshBasicMaterial({ color: new THREE.Color(skin.trim).multiplyScalar(1.8) });
    const domeGeometry = new THREE.SphereGeometry(0.46, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const glass = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.2 });
    const rider = new THREE.Mesh(box, face);
    rider.scale.setScalar(0.52);
    rider.position.y = 0.2;
    const saucer = new THREE.Mesh(saucerGeometry, hull);
    saucer.position.y = -0.08;
    const band = new THREE.Mesh(rimGeometry, rim);
    band.position.y = -0.08;
    const dome = new THREE.Mesh(domeGeometry, glass);
    dome.position.y = 0;
    // Tipped toward the camera, so the dome and its rider show instead of a thin edge.
    const tilt = new THREE.Group();
    tilt.rotation.x = 0.3;
    tilt.add(saucer, band, rider, dome);
    ufo.add(tilt);

    const ballMaterial = new THREE.MeshStandardMaterial({
      map: ballSkin(skin.main, skin.trim, false),
      emissiveMap: ballSkin(skin.main, skin.trim, true),
      emissive: 0xffffff,
      emissiveIntensity: 0.55,
      roughness: 0.35,
    });
    const sphere = new THREE.SphereGeometry(0.46, 32, 20);
    const ball = new THREE.Mesh(sphere, ballMaterial);

    // A back face shell a little bigger than each form draws its outline, turning with it.
    const outline = new THREE.MeshBasicMaterial({ color: OUTLINE, side: THREE.BackSide });
    const shell = (geometry: THREE.BufferGeometry, scale: number, into: THREE.Object3D, at?: THREE.Object3D) => {
      const mesh = new THREE.Mesh(geometry, outline);
      mesh.scale.setScalar(scale);
      if (at) mesh.position.copy(at.position);
      into.add(mesh);
    };
    shell(box, 1.12, cube);
    shell(sphere, 1.13, ball);
    shell(saucerGeometry, 1.08, tilt, saucer);

    this.forms = { cube, ufo, ball };
    this.halo = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowSprite(), color: skin.trim, transparent: true, opacity: ghost ? 0.1 : 0.18, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.halo.scale.setScalar(2.2);
    this.body.add(cube, ufo, ball);
    this.group.add(this.body, this.halo);
    this.materials.push(face, hull, rim, glass, ballMaterial, outline, this.halo.material);
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
    this.group.position.set(state.x, state.y, this.z);
    const form = this.forms[state.mode];
    form.rotation.z = state.angle;
    this.squash = Math.max(0, this.squash - dt * 6);
    const s = this.squash * this.squash;
    // The squash is along gravity, so a ball on the ceiling flattens upward. On the form itself it
    // followed the form's turn, and a rolling ball landed squashed along whatever way it faced.
    // The saucer is a touch bigger than the cube, so its flat shape reads as clearly at a glance.
    const size = state.mode === "ufo" ? 1.2 : 1;
    this.body.scale.set(size * (1 + s * 0.16), size * (1 - s * 0.22), size * (1 + s * 0.16));
    this.body.position.y = -s * 0.1 * state.gravity;
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
