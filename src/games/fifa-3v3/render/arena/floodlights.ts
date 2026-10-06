import * as THREE from "three";
import { PITCH } from "../../engine/tuning";
import { merge, paint, rod } from "../models/geo";
import { glareStrength, glareTexture } from "./glare";

const HEIGHT = 27;
const LAMPS = 16;

/**
 * Four floodlight towers at the corners: lattice masts with a tilted
 * bank of lamps each. The lamps burn far above white, so the finish
 * blooms them, and each bank throws a lens glare that swells as the
 * camera comes round into its beam. All four masts are one draw, all
 * the lamps another.
 */
export class Floodlights {
  readonly group = new THREE.Group();
  private readonly glares: { sprite: THREE.Sprite; facing: THREE.Vector3 }[] = [];
  private readonly disposables: { dispose(): void }[] = [];
  private readonly toCamera = new THREE.Vector3();

  constructor() {
    const steel = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.6 });
    const lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color("#fff6e6").multiplyScalar(14) });
    const map = glareTexture();
    const glare = new THREE.SpriteMaterial({ map, color: "#fff1dc", blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    this.disposables.push(steel, lamp, map, glare);
    const x = PITCH.halfLength + 10.5;
    const z = PITCH.halfWidth + 9;
    const masts: THREE.BufferGeometry[] = [];
    const lamps: THREE.BufferGeometry[] = [];
    const m = new THREE.Matrix4();
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      const base = new THREE.Vector3(sx * x, 5, sz * z);
      for (const g of lattice()) masts.push(g.translate(base.x, base.y, base.z));
      // The bank faces a point short of the centre spot, tipped down toward it.
      const head = new THREE.Object3D();
      head.position.set(base.x, base.y + HEIGHT - 5, base.z);
      head.lookAt(-sx * 6, 0, -sz * 3);
      head.updateMatrixWorld();
      const frame = paint(new THREE.BoxGeometry(6.2, 3.6, 0.4), "#2f333b", { at: [0, 0, -0.1] });
      masts.push(frame.applyMatrix4(head.matrixWorld));
      for (let i = 0; i < LAMPS; i++) {
        m.makeTranslation(-2.25 + (i % 4) * 1.5, -1.2 + Math.floor(i / 4) * 0.8, 0.14);
        lamps.push(new THREE.BoxGeometry(1.2, 0.62, 0.1).applyMatrix4(m).applyMatrix4(head.matrixWorld));
      }
      const sprite = new THREE.Sprite(glare);
      sprite.position.copy(head.position).add(new THREE.Vector3(0, 0, 0.9).applyQuaternion(head.quaternion));
      sprite.renderOrder = 6;
      this.glares.push({ sprite, facing: new THREE.Vector3(0, 0, 1).applyQuaternion(head.quaternion) });
      this.group.add(sprite);
    }
    const mastGeo = merge(masts);
    const lampGeo = merge(lamps.map((g) => paint(g, "#ffffff")));
    this.disposables.push(mastGeo, lampGeo);
    this.group.add(new THREE.Mesh(mastGeo, steel), new THREE.Mesh(lampGeo, lamp));
  }

  /** Sizes each glare for where the camera stands. */
  update(camera: THREE.Camera): void {
    for (const { sprite, facing } of this.glares) {
      this.toCamera.copy(camera.position).sub(sprite.position);
      const far = this.toCamera.length();
      const k = glareStrength(facing, this.toCamera.normalize());
      sprite.visible = k > 0.01;
      // Glare is a lens effect: it keeps its size on screen however far away the lamp is.
      const size = far * (0.12 + 0.3 * k);
      sprite.scale.set(size * 1.6, size, 1);
      sprite.material.opacity = 0.35 + 0.65 * k;
    }
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
  }
}

/** A tapering lattice mast: four legs, braced across every few metres. */
function lattice(): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  const h = HEIGHT - 5;
  const w = (y: number) => 0.9 - (0.5 * y) / h;
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const;
  for (const [cx, cz] of corners) parts.push(rod([cx * w(0), 0, cz * w(0)], [cx * w(h), h, cz * w(h)], 0.07, "#8a909b", 6));
  for (let y = 0; y < h; y += 2.2) {
    for (let i = 0; i < 4; i++) {
      const [ax, az] = corners[i]!;
      const [bx, bz] = corners[(i + 1) % 4]!;
      parts.push(rod([ax * w(y), y, az * w(y)], [bx * w(y + 2.2), y + 2.2, bz * w(y + 2.2)], 0.035, "#6f7580", 4));
    }
  }
  return parts;
}
