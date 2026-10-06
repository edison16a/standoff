import * as THREE from "three";

/** What a body needs for its contact shadows: where it stands and where its ankles are. */
export interface Grounded {
  root: THREE.Object3D;
  ankleL: THREE.Object3D;
  ankleR: THREE.Object3D;
}

const MAX = 12;
const foot = new THREE.Vector3();
const m = new THREE.Matrix4();
const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
const s = new THREE.Vector3();
const p = new THREE.Vector3();

/** How wide a foot's contact shadow is, in metres, for an ankle this high: full on the turf, gone by a stride's lift. */
export function footShadow(ankleHeight: number): number {
  const t = Math.min(1, Math.max(0, (ankleHeight - 0.12) / 0.3));
  return 0.42 * (1 - t) * (1 - t);
}

/**
 * The darkening where bodies meet the turf, which the shadow map is too
 * coarse to show: a soft pool of ambient occlusion under each body, and
 * a tighter dark spot under each foot while it is planted, shrinking as
 * it lifts. All of it is one instanced draw.
 */
export class ContactShadows {
  readonly mesh: THREE.InstancedMesh;

  constructor(blob: THREE.Texture) {
    const material = new THREE.MeshBasicMaterial({ map: blob, color: "#000000", transparent: true, opacity: 0.42, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, MAX * 3);
    this.mesh.renderOrder = 1;
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
  }

  update(bodies: readonly Grounded[]): void {
    let n = 0;
    const place = (x: number, z: number, w: number, d: number) => {
      if (n >= MAX * 3 || w <= 0.01) return;
      m.compose(p.set(x, 0.014 + n * 0.0002, z), q, s.set(w, d, 1));
      this.mesh.setMatrixAt(n++, m);
    };
    for (const body of bodies.slice(0, MAX)) {
      const r = body.root.position;
      place(r.x, r.z, 1.25, 1.25);
      for (const ankle of [body.ankleL, body.ankleR]) {
        ankle.getWorldPosition(foot);
        const w = footShadow(foot.y);
        place(foot.x, foot.z, w, w);
      }
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.dispose();
  }
}
