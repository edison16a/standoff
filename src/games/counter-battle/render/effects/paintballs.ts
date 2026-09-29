import * as THREE from "three";
import { BALL_FLIGHT } from "../../engine/tuning";

interface Ball {
  from: THREE.Vector3;
  dir: THREE.Vector3;
  total: number;
  born: number;
  speed: number;
  colour: THREE.Color;
}

const MAX = 160;
/** A real paintball is 17 mm across; drawn a little bigger so it reads on a split screen. */
const RADIUS = 0.014;
/** How many pixels across a ball stays however far away it is. */
const MIN_PIXELS = 3;
const Y = new THREE.Vector3(0, 1, 0);
const m = new THREE.Matrix4();
const s = new THREE.Vector3();

interface Drawn {
  at: THREE.Vector3;
  turn: THREE.Quaternion;
  stretch: number;
}

/**
 * The paintballs in flight: glossy balls in the shooter's team colour
 * that fly from the barrel to where the shot landed, stretched a little
 * along their path so they read as fast. Widened for each view so a far
 * one is still a few pixels across. One instanced draw for all of them.
 */
export class Paintballs {
  readonly mesh: THREE.InstancedMesh;
  private readonly live: Ball[] = [];
  private readonly drawn: Drawn[] = [];
  private readonly geo = new THREE.SphereGeometry(1, 10, 8);
  private readonly mat = new THREE.MeshStandardMaterial({ roughness: 0.18, metalness: 0, emissive: "#ffffff", emissiveIntensity: 0.18 });

  constructor() {
    this.mesh = new THREE.InstancedMesh(this.geo, this.mat, MAX);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3).fill(1), 3);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.renderOrder = 6;
    for (let i = 0; i < MAX; i++) this.drawn.push({ at: new THREE.Vector3(), turn: new THREE.Quaternion(), stretch: 1 });
  }

  /** A ball from `from` to `to`. Returns the seconds until it lands. */
  add(from: THREE.Vector3, to: THREE.Vector3, colour: THREE.ColorRepresentation, now: number, pellet: boolean): number {
    if (this.live.length >= MAX) this.live.shift();
    const dir = to.clone().sub(from);
    const total = dir.length();
    const speed = pellet ? BALL_FLIGHT.pellet : BALL_FLIGHT.ball;
    this.live.push({ from: from.clone(), dir: dir.normalize(), total, born: now, speed, colour: new THREE.Color(colour) });
    return total / speed;
  }

  /** Moves every ball along its path; balls that have landed go. */
  update(now: number): void {
    let n = 0;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const b = this.live[i]!;
      const travelled = (now - b.born) * b.speed;
      if (travelled >= b.total) {
        this.live.splice(i, 1);
        continue;
      }
      const d = this.drawn[n]!;
      d.at.copy(b.from).addScaledVector(b.dir, Math.max(0, travelled));
      d.turn.setFromUnitVectors(Y, b.dir);
      // Stretched a little along its flight, as a camera shutter would, but still a ball.
      d.stretch = Math.min(4, Math.max(1, ((b.speed / 60) * 0.03) / RADIUS));
      this.mesh.setColorAt(n, b.colour);
      n += 1;
    }
    this.mesh.count = n;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  /** Sizes every ball for one view: at least a few pixels across from where this camera is. */
  setView(camera: THREE.Vector3, fovDeg: number, heightPx: number): void {
    const perMetre = (2 * Math.tan((fovDeg * Math.PI) / 360)) / Math.max(1, heightPx);
    for (let i = 0; i < this.mesh.count; i++) {
      const d = this.drawn[i]!;
      const r = Math.max(RADIUS, d.at.distanceTo(camera) * perMetre * MIN_PIXELS * 0.5);
      s.set(r, Math.max(r, RADIUS * d.stretch), r);
      m.compose(d.at, d.turn, s);
      this.mesh.setMatrixAt(i, m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear(): void {
    this.live.length = 0;
    this.mesh.count = 0;
  }

  dispose(): void {
    this.geo.dispose();
    this.mat.dispose();
    this.mesh.dispose();
  }
}
