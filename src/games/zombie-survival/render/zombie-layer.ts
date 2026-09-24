import * as THREE from "three";
import type { FightFrame } from "../engine/route";
import { alive, type Zombie } from "../engine/zombie";
import { isBoss } from "../engine/zombie-kinds";
import { poseZombie } from "./models/zombies/animate";
import { buildBoss } from "./models/zombies/bosses";
import { buildCommoner, type Setting } from "./models/zombies/commoners";
import type { Rig } from "./models/zombies/rig";
import { animateWeakPoints, type WeakMarker } from "./models/zombies/weak-points";
import { glowTexture } from "./textures";

interface ZombieView {
  rig: Rig;
  weak: WeakMarker[];
  shadow: THREE.Mesh;
  flinch: number;
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

  sync(zombies: readonly Zombie[], frame: FightFrame | null, dt: number): void {
    const seen = new Set<number>();
    if (frame) {
      for (const z of zombies) {
        seen.add(z.id);
        const view = this.views.get(z.id) ?? this.create(z);
        view.flinch = Math.max(0, view.flinch - dt * 5);
        this.place(view, z, frame);
        poseZombie(view.rig, z, view.flinch);
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

  /** The kind of zombie a proxy belongs to is looked up by the caller. A hit makes it jolt. */
  flinch(id: number): void {
    const view = this.views.get(id);
    if (view) view.flinch = 1;
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
    const view = { rig: built.rig, weak: built.weak, shadow, flinch: 0 };
    this.views.set(z.id, view);
    return view;
  }

  private place(view: ZombieView, z: Zombie, frame: FightFrame): void {
    const at = frame.place(z.ahead, z.side);
    const root = view.rig.root;
    root.position.set(at.x, at.y, at.z);
    // Face the team, who stand at the fight's origin.
    const dx = frame.origin.x - at.x;
    const dz = frame.origin.z - at.z;
    // A shambler never walks quite straight at you.
    const wander = z.state === "walk" ? Math.sin(z.age * 0.8 + z.seed * 9) * 0.22 : 0;
    root.rotation.y = Math.atan2(dx, dz) + wander;
    view.shadow.visible = z.state !== "dead" || z.stateTime < 3;
  }

  private remove(id: number, view: ZombieView): void {
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
