import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import { ROUND_TILES, tileUv } from "./splat-art";

/** Splats one fighter can carry. Past this the oldest comes off. */
const PER_FIGHTER = 10;
/** Splats built in one frame at most, since each is projected onto a body part. */
const PER_FRAME = 4;

const ray = new THREE.Raycaster();
const inv = new THREE.Matrix4();
const look = new THREE.Matrix4();
const e = new THREE.Euler();
const up = new THREE.Vector3(0, 1, 0);
const size = new THREE.Vector3();

interface Worn {
  mesh: THREE.Mesh;
  geo: THREE.BufferGeometry;
}

/**
 * Paint on the fighters themselves: a hit leaves a splat on the vest,
 * the arm or the mask, wrapped round that body part so it follows every
 * move. The splat is projected onto the part the ball struck, found by a
 * ray along the shot. A few per fighter, cleared each round.
 */
export class BodySplats {
  private readonly worn = new Map<number, Worn[]>();
  private readonly mats = new Map<string, THREE.MeshStandardMaterial>();
  private budget = PER_FRAME;

  constructor(private readonly atlas: THREE.Texture) {}

  /** A splat on `meshes` (one fighter's body parts) where a ball from `from` struck near `to`. */
  add(fighter: number, meshes: readonly THREE.Mesh[], from: THREE.Vector3, to: THREE.Vector3, colour: string, radius: number, pick: number, spin: number): void {
    if (this.budget <= 0) return;
    const dir = to.clone().sub(from).normalize();
    // Start just short of the hit, so the ray finds the body even if the engine's hit shape sits outside the mesh.
    ray.set(to.clone().addScaledVector(dir, -0.6), dir);
    ray.far = 1.4;
    const hit = ray.intersectObjects(meshes as THREE.Mesh[], false)[0];
    if (!hit || !(hit.object instanceof THREE.Mesh)) return;
    this.budget -= 1;
    const part = hit.object;
    part.updateWorldMatrix(true, false);
    // The projector looks back along the shot, turned at random about it.
    look.lookAt(hit.point, hit.point.clone().sub(dir), up);
    e.setFromRotationMatrix(look);
    e.z += spin * Math.PI * 2;
    size.set(radius * 2, radius * 2, radius * 2.5);
    const geo = new DecalGeometry(part, hit.point, e, size);
    if (!geo.getAttribute("position") || geo.getAttribute("position").count === 0) return geo.dispose();
    // Into the part's own space, so it rides the animation; and onto one tile of the atlas.
    geo.applyMatrix4(inv.copy(part.matrixWorld).invert());
    const t = tileUv(Math.floor(pick * ROUND_TILES));
    const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, t.u + uv.getX(i) * t.size, t.v + uv.getY(i) * t.size);
    const mesh = new THREE.Mesh(geo, this.material(colour));
    mesh.renderOrder = 2;
    part.add(mesh);
    const list = this.worn.get(fighter) ?? [];
    list.push({ mesh, geo });
    if (list.length > PER_FIGHTER) this.remove(list.shift()!);
    this.worn.set(fighter, list);
  }

  /** A new frame: a fresh budget of splats to project. */
  frame(): void {
    this.budget = PER_FRAME;
  }

  private material(colour: string): THREE.MeshStandardMaterial {
    let mat = this.mats.get(colour);
    if (!mat) {
      // The atlas's green channel is the splat's cover, which is what alphaMap reads.
      mat = new THREE.MeshStandardMaterial({ color: colour, alphaMap: this.atlas, alphaTest: 0.5, roughness: 0.25, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
      this.mats.set(colour, mat);
    }
    return mat;
  }

  private remove(w: Worn): void {
    w.mesh.removeFromParent();
    w.geo.dispose();
  }

  clear(): void {
    for (const list of this.worn.values()) list.forEach((w) => this.remove(w));
    this.worn.clear();
  }

  dispose(): void {
    this.clear();
    for (const m of this.mats.values()) m.dispose();
  }
}
