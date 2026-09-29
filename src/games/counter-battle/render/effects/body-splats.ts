import * as THREE from "three";
import { DRIP_FROM } from "./decal-atlas";
import { DECAL_ATTRIBUTE, decalGeometry, type DecalMaterial } from "./decal-material";
import { splatFrame } from "./decals";

/** Most splats one fighter carries; a new one past this replaces their oldest. */
const PER_FIGHTER = 10;
/** Arms, legs and a padded vest curve round about this tightly, metres. */
const BODY_RADIUS = 0.13;

interface Stuck {
  fighter: number;
  /** The body part it landed on, which it rides as the fighter moves. */
  part: THREE.Object3D;
  /** Where it sits in that part's own space. */
  local: THREE.Matrix4;
  tile: number;
  born: number;
  bend: number;
  colour: THREE.Color;
}

const ray = new THREE.Raycaster();
const dir = new THREE.Vector3();
const normal = new THREE.Vector3();
const p = new THREE.Vector3();
const q = new THREE.Quaternion();
const s = new THREE.Vector3();
const m = new THREE.Matrix4();
const c = new THREE.Color();

/**
 * Paint on the fighters themselves: a hit leaves the shooter's colour
 * where the ball struck, found by casting the shot at the fighter's real
 * body, and the splat rides that body part as it runs, kneels and falls.
 * One instanced draw for everyone, a few splats per fighter at most.
 */
export class BodySplats {
  readonly mesh: THREE.InstancedMesh;
  private readonly geo = decalGeometry();
  private readonly info: THREE.InstancedBufferAttribute;
  private readonly stuck: Stuck[] = [];

  constructor(material: DecalMaterial, private readonly max = 48) {
    this.info = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.geo.setAttribute(DECAL_ATTRIBUTE, this.info);
    this.mesh = new THREE.InstancedMesh(this.geo, material, max);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3).fill(1), 3);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
  }

  /**
   * A ball from `from` struck fighter `id` near `to`. Returns false when
   * the line misses the body (the hit box is a little rounder than the
   * model), so the caller can let that one go.
   */
  add(id: number, meshes: readonly THREE.Mesh[], from: THREE.Vector3, to: THREE.Vector3, colour: THREE.ColorRepresentation, now: number, pick: number): boolean {
    dir.subVectors(to, from).normalize();
    ray.set(from, dir);
    ray.far = from.distanceTo(to) + 0.6;
    const hit = ray.intersectObjects(meshes as THREE.Mesh[], false)[0];
    if (!hit?.face || !hit.object.parent) return false;
    normal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
    const size = 0.11 + pick * 0.07;
    splatFrame(normal, dir, pick, q);
    p.copy(hit.point).addScaledVector(normal, 0.006);
    m.compose(p, q, s.setScalar(size));
    const part = hit.object;
    const local = new THREE.Matrix4().copy(part.matrixWorld).invert().multiply(m);
    // Room is made by dropping this fighter's oldest splat, or the oldest of all.
    const mine = this.stuck.filter((x) => x.fighter === id);
    if (mine.length >= PER_FIGHTER) this.stuck.splice(this.stuck.indexOf(mine[0]!), 1);
    else if (this.stuck.length >= this.max) this.stuck.shift();
    // Bodies get the flat splats: a drip on a running arm would look pasted on.
    this.stuck.push({ fighter: id, part, local, tile: Math.floor(pick * DRIP_FROM), born: now, bend: size / BODY_RADIUS, colour: new THREE.Color(colour) });
    return true;
  }

  /** Moves every splat with its body part. Call once a frame, after the fighters are posed. */
  update(): void {
    // Everything is written again each frame: a dropped old splat shifts the rest down the list.
    this.stuck.forEach((x, i) => {
      m.multiplyMatrices(x.part.matrixWorld, x.local);
      this.mesh.setMatrixAt(i, m);
      this.info.setXYZ(i, x.tile, x.born, x.bend);
      this.mesh.setColorAt(i, c.copy(x.colour));
    });
    this.mesh.count = this.stuck.length;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.info.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  /** Clean kit for everyone: a new round, or new fighters. */
  clear(): void {
    this.stuck.length = 0;
    this.mesh.count = 0;
  }

  dispose(): void {
    this.geo.dispose();
    this.mesh.dispose();
  }
}
