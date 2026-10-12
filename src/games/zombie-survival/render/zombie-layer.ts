import * as THREE from "three";
import type { FightFrame } from "../engine/route";
import type { HitPart } from "../engine/zombie-kinds";
import { alive, type Zombie } from "../engine/zombie";
import { isBoss } from "../engine/zombie-kinds";
import { poseZombie, strideRate } from "./models/zombies/animate";
import { buildBoss } from "./models/zombies/bosses";
import { buildCommoner, type Setting } from "./models/zombies/commoners";
import { HitReaction } from "./models/zombies/hit-reaction";
import { PoseBlend } from "./models/zombies/pose-blend";
import type { Rig } from "./models/zombies/rig";
import { animateWeakPoints, type WeakMarker } from "./models/zombies/weak-points";
import { ArrivalQueue } from "./ballistics/arrivals";
import type { TargetPoint } from "./scene-source";
import { glowTexture } from "./textures";

const Y = new THREE.Vector3(0, 1, 0);

/** A shambler never walks quite straight at you. */
const wander = (z: Zombie) => (z.state === "walk" ? Math.sin(z.age * 0.8 + z.seed * 9) * 0.22 : 0);

/** A round on its way to a zombie, in world space, as the shot saw it. */
export interface IncomingHit {
  /** The way the round travels, a unit vector. */
  dir: THREE.Vector3;
  /** Where it strikes, or null when only the zombie is known. */
  point: THREE.Vector3 | null;
  weight: number;
  part: HitPart;
}

interface ZombieView {
  rig: Rig;
  weak: WeakMarker[];
  shadow: THREE.Mesh;
  reaction: HitReaction;
  blend: PoseBlend;
  /** The sideways drift of its heading, eased so it never snaps when the walk stops. */
  wander: number;
  /** Walk cycles done, added up so the legs carry on smoothly when the pace changes. */
  cycle: number;
}

/**
 * Draws the zombies the engine is running: builds a model when one
 * appears, places and poses it every frame, and removes it once the
 * engine clears the body away. It also hands the raycast the hit shapes
 * of every zombie still standing.
 */
export class ZombieLayer {
  readonly group = new THREE.Group();
  private readonly views = new Map<number, ZombieView>();
  /** Where the fight is, so new zombies come dressed for it. */
  setting: Setting = "town";
  private standing: THREE.Mesh[] = [];
  private readonly shadowGeo = new THREE.CircleGeometry(1, 20);
  private readonly shadowMat = new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false });
  /** Hits waiting for their round to arrive, by zombie. */
  private readonly incoming = new ArrivalQueue<IncomingHit>();
  private clock = 0;
  private readonly shove = { x: 0, z: 0 };
  private readonly local = new THREE.Vector3();

  /** Seconds this layer has run. Arrival times for `hit` are on this clock. */
  get now(): number {
    return this.clock;
  }

  sync(zombies: readonly Zombie[], frame: FightFrame | null, dt: number): void {
    this.clock += dt;
    this.incoming.due(this.clock, (id, hit) => this.land(id, hit));
    const seen = new Set<number>();
    if (frame) {
      for (const z of zombies) {
        seen.add(z.id);
        const view = this.views.get(z.id) ?? this.create(z);
        this.place(view, z, frame, dt);
        view.blend.before(view.rig, z.state);
        view.cycle += strideRate(view.rig, z) * dt;
        poseZombie(view.rig, z, 0, view.cycle);
        view.blend.after(view.rig, dt);
        view.reaction.step(dt);
        this.react(view);
        for (const eye of view.rig.eyes) eye.visible = z.state !== "dead";
        animateWeakPoints(view.weak, z.weak, z.age);
      }
    }
    for (const [id, view] of this.views) if (!seen.has(id)) this.remove(id, view);
    this.standing = [];
    for (const z of zombies) if (alive(z)) this.standing.push(...(this.views.get(z.id)?.rig.proxies ?? []));
  }

  /** Hit shapes of every standing zombie. Each carries its zombie id, part and weak point. */
  proxies(): readonly THREE.Mesh[] {
    return this.standing;
  }

  /** Every hit shape of a standing zombie as `camera` sees it, in the aim's clip space. */
  targets(camera: THREE.Camera): TargetPoint[] {
    return this.standing.map((proxy) => {
      const at = proxy.getWorldPosition(new THREE.Vector3());
      const distance = at.distanceTo(camera.position);
      at.project(camera);
      const data = proxy.userData as Pick<TargetPoint, "zombie" | "part" | "weak">;
      return { zombie: data.zombie, part: data.part, weak: data.weak, x: at.x, y: at.y, distance };
    });
  }

  /** A round that will strike zombie `id` when this layer's clock reaches `at`. It reacts then, not before. */
  hit(id: number, hit: IncomingHit, at: number): void {
    this.incoming.push(id, at, hit);
  }

  /** World position of a zombie's chest, for effects and sound. */
  chest(id: number, out: THREE.Vector3): boolean {
    const view = this.views.get(id);
    if (!view) return false;
    view.rig.bones.spine.getWorldPosition(out);
    return true;
  }

  clear(): void {
    for (const [id, view] of this.views) this.remove(id, view);
  }

  dispose(): void {
    this.clear();
    this.shadowGeo.dispose();
    this.shadowMat.dispose();
  }

  private create(z: Zombie): ZombieView {
    const built = isBoss(z.kind) ? buildBoss(z.kind, z.seed) : { rig: buildCommoner(z.kind as "walker", z.seed, this.setting), weak: [] };
    for (const proxy of built.rig.proxies) proxy.userData.zombie = z.id;
    const shadow = new THREE.Mesh(this.shadowGeo, this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.setScalar(isBoss(z.kind) ? 1.6 : 0.55);
    shadow.position.y = 0.03;
    built.rig.root.add(shadow);
    this.group.add(built.rig.root);
    const view = { rig: built.rig, weak: built.weak, shadow, reaction: new HitReaction(), blend: new PoseBlend(), wander: wander(z), cycle: 0 };
    this.views.set(z.id, view);
    return view;
  }

  private place(view: ZombieView, z: Zombie, frame: FightFrame, dt: number): void {
    const at = frame.place(z.ahead, z.side);
    const root = view.rig.root;
    root.position.set(at.x, at.y, at.z);
    // Face the team, who stand at the fight's origin.
    const dx = frame.origin.x - at.x;
    const dz = frame.origin.z - at.z;
    view.wander += (wander(z) - view.wander) * Math.min(1, dt * 8);
    root.rotation.y = Math.atan2(dx, dz) + view.wander;
    view.shadow.visible = z.state !== "dead" || z.stateTime < 3;
  }

  /** A round arrives: the hit is turned into the zombie's own frame and kicks its reaction. */
  private land(id: number, hit: IncomingHit): void {
    const view = this.views.get(id);
    if (!view) return;
    const root = view.rig.root;
    const turn = -root.rotation.y;
    this.local.copy(hit.dir).applyAxisAngle(Y, turn);
    const dirX = this.local.x;
    const dirZ = this.local.z;
    let side = 0;
    if (hit.point) {
      this.local.copy(hit.point).sub(root.position).applyAxisAngle(Y, turn);
      // Within a hand's width of the middle counts as square on.
      side = Math.abs(this.local.x) < 0.06 ? 0 : Math.sign(this.local.x);
    }
    view.reaction.hit({ dirX, dirZ, side, weight: hit.weight, part: hit.part });
  }

  /** Lays the reaction over the pose, and shoves the body back along the round's path. */
  private react(view: ZombieView): void {
    view.reaction.apply(view.rig);
    const root = view.rig.root;
    const { x, z } = view.reaction.shove(this.shove);
    const c = Math.cos(root.rotation.y);
    const s = Math.sin(root.rotation.y);
    root.position.x += x * c + z * s;
    root.position.z += -x * s + z * c;
  }

  private remove(id: number, view: ZombieView): void {
    this.incoming.drop(id);
    this.group.remove(view.rig.root);
    view.rig.root.traverse((o) => {
      if (o instanceof THREE.Mesh && o.userData.visual) o.geometry.dispose();
      if (o instanceof THREE.Mesh && o.userData.part) o.geometry.dispose();
      if (o instanceof THREE.Sprite && !o.userData.shared) o.material.dispose();
    });
    for (const w of view.weak) (w.ring.material as THREE.Material).dispose();
    this.views.delete(id);
  }
}
