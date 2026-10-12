import * as THREE from "three";
import { CASING_STEP, CASINGS, CasingBody, EJECT_HEIGHT } from "../../ballistics/casings";
import { Rng } from "../../engine/rng";
import type { WeaponId } from "../../engine/weapons";
import { CasingMeshes } from "./casing-meshes";
import { casingFrame, portShare, toWorld, type CasingFrame } from "./casing-frame";
import { casingTurn } from "./casing-turn";

/** Where a gun's port is at the moment it throws a case, all in world space. */
export interface Ejection {
  port: THREE.Vector3;
  /** The gun's right hand direction, out of the port. */
  right: THREE.Vector3;
  /** Height of the street under the shooter. */
  ground: number;
}

interface Pending {
  at: number;
  weapon: WeaponId;
  seed: number;
  locate: () => Ejection | null;
}

interface Live {
  weapon: WeaponId;
  body: CasingBody;
  random: () => number;
  frame: CasingFrame;
  frameTurn: THREE.Quaternion;
  origin: THREE.Vector3;
  /** The real port's height above the shared ejection height, faded out as the case leaves. */
  lift: number;
  owed: number;
  pos: THREE.Vector3;
  turn: THREE.Quaternion;
  /** A random lean of the tumble, from the seed, so no two cases spin in the same plane. */
  tilt: number;
  /** Heading on the ground, kept once it stops. */
  lie: number;
  smoke: number;
}

/** Cases further than this from the camera are left behind for good. */
const KEEP_RADIUS = 40;
/** A shotgun hull smokes for this long after it leaves the gun. */
const HULL_SMOKE = 0.9;

/**
 * Spent cases in the world. Each is thrown from its gun's port at the
 * moment the action cycles, then tumbles, bounces and rolls by the shared
 * case physics, seeded from the shot so the sound's clinks land with it.
 * Cases live in world space: the team walks on and they stay on the
 * street behind it until they are far away. Only so many are kept; past
 * that the oldest is picked up for the next.
 */
export class Casings {
  private readonly meshes: CasingMeshes;
  private readonly pending: Pending[] = [];
  private readonly live: Live[] = [];
  private now = 0;
  private readonly matrix = new THREE.Matrix4();
  private readonly one = new THREE.Vector3(1, 1, 1);
  private readonly target = new THREE.Quaternion();
  private readonly counts: Record<WeaponId, number> = { shotgun: 0, smg: 0, rifle: 0, ak47: 0 };

  constructor(
    private readonly cap: number,
    private readonly trail: (at: THREE.Vector3) => void,
  ) {
    this.meshes = new CasingMeshes(cap);
  }

  get group(): THREE.Group {
    return this.meshes.group;
  }

  /** Throws a case `delay` seconds from now, from wherever `locate` says the port is by then. */
  eject(weapon: WeaponId, seed: number, delay: number, locate: () => Ejection | null): void {
    this.pending.push({ at: this.now + delay, weapon, seed, locate });
  }

  update(dt: number, eye?: THREE.Vector3): void {
    this.now += dt;
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i]!;
      if (p.at > this.now) continue;
      this.pending.splice(i, 1);
      const where = p.locate();
      if (where) this.spawn(p.weapon, p.seed, where);
    }
    for (const c of this.live) this.step(c, dt);
    if (eye) this.forget(eye);
    this.draw();
  }

  dispose(): void {
    this.meshes.dispose();
    this.live.length = 0;
    this.pending.length = 0;
  }

  private spawn(weapon: WeaponId, seed: number, where: Ejection): void {
    // The same seed through the same steps as the sound, so both see the same case.
    const rng = new Rng(seed);
    const random = () => rng.next();
    const body = new CasingBody(CASINGS[weapon], EJECT_HEIGHT, random);
    const frame = casingFrame(where.right);
    const basis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(frame.x.x, 0, frame.x.z),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(frame.z.x, 0, frame.z.z),
    );
    const c: Live = {
      weapon, body, random, frame,
      frameTurn: new THREE.Quaternion().setFromRotationMatrix(basis),
      origin: new THREE.Vector3(where.port.x, where.ground, where.port.z),
      lift: where.port.y - where.ground - EJECT_HEIGHT,
      owed: 0,
      pos: new THREE.Vector3(),
      turn: new THREE.Quaternion(),
      tilt: ((Math.imul(seed, 0x9e3779b1) >>> 0) / 4294967296 - 0.5) * 1.2,
      lie: 0,
      smoke: 0,
    };
    this.live.push(c);
    if (this.live.length > this.cap) this.live.shift();
    this.place(c, 1);
  }

  /** Runs the case's fixed physics steps owed for this frame, then places it. */
  private step(c: Live, dt: number): void {
    c.owed += dt;
    while (c.owed >= CASING_STEP && !c.body.resting) {
      c.body.step(c.random);
      c.owed -= CASING_STEP;
    }
    if (c.body.resting) c.owed = 0;
    this.place(c, 1 - Math.exp(-dt * 30));
    if (c.weapon === "shotgun" && c.body.age < HULL_SMOKE && !c.body.resting) {
      c.smoke += dt;
      if (c.smoke > 0.035) {
        c.smoke = 0;
        this.trail(c.pos);
      }
    }
  }

  /** Sets the case's world position and turn from its body. `ease` smooths the turn once it is on the ground. */
  private place(c: Live, ease: number): void {
    const b = c.body;
    toWorld(c.frame, c.origin, b.pos, c.pos);
    c.pos.y += c.lift * portShare(b.age);
    const grounded = b.pos.y <= 0 && b.vel.y === 0;
    if (grounded && Math.hypot(b.vel.x, b.vel.z) > 0.02) c.lie = Math.atan2(b.vel.x, b.vel.z) + Math.PI / 2;
    casingTurn(grounded, b.heading, b.angle, c.tilt, c.lie, this.target);
    this.target.premultiply(c.frameTurn);
    if (grounded) c.turn.slerp(this.target, ease);
    else c.turn.copy(this.target);
  }

  /** Drops cases the team has left far behind, and the oldest when it has to. */
  private forget(eye: THREE.Vector3): void {
    let keep = 0;
    for (const c of this.live) if (c.pos.distanceToSquared(eye) < KEEP_RADIUS * KEEP_RADIUS) this.live[keep++] = c;
    this.live.length = keep;
  }

  private draw(): void {
    const counts = this.counts;
    counts.shotgun = counts.smg = counts.rifle = counts.ak47 = 0;
    this.meshes.syncReflections();
    for (const c of this.live) {
      const mesh = this.meshes.meshes[c.weapon];
      this.matrix.compose(c.pos, c.turn, this.one);
      mesh.setMatrixAt(counts[c.weapon]++, this.matrix);
    }
    for (const [weapon, mesh] of Object.entries(this.meshes.meshes) as [WeaponId, THREE.InstancedMesh][]) {
      mesh.count = counts[weapon];
      mesh.visible = mesh.count > 0;
      if (mesh.count > 0) mesh.instanceMatrix.needsUpdate = true;
    }
  }
}
