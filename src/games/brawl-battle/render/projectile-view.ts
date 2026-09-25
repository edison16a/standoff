import * as THREE from "three";
import type { MatchState } from "../engine/types";
import type { Effects } from "./effects/effects";

const POOL = 8;

interface Orb {
  group: THREE.Group;
  shell: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshBasicMaterial>;
  prev: THREE.Vector2;
  id: number;
}

/**
 * Magic bolts in flight: a white hot core in a crackling shell of the
 * caster's colour, shedding sparks as it goes. Drawn from a small pool,
 * blended between engine steps like the fighters.
 */
export class ProjectileView {
  readonly group = new THREE.Group();
  private readonly orbs: Orb[] = [];
  private readonly core = new THREE.IcosahedronGeometry(1, 1);
  private readonly coreMat = new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false });

  constructor(private readonly fx: Effects) {
    for (let i = 0; i < POOL; i++) {
      const group = new THREE.Group();
      const shellMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      const shell = new THREE.Mesh(this.core, shellMat);
      const inner = new THREE.Mesh(this.core, this.coreMat);
      inner.scale.setScalar(0.5);
      group.add(inner, shell);
      group.visible = false;
      this.group.add(group);
      this.orbs.push({ group, shell, prev: new THREE.Vector2(), id: -1 });
    }
  }

  /** Called before each engine step, so bolts can blend between steps. */
  remember(state: MatchState): void {
    for (const orb of this.orbs) {
      const p = state.projectiles.find((q) => q.id === orb.id);
      if (p) orb.prev.set(p.pos.x, p.pos.y);
    }
  }

  update(state: MatchState, alpha: number, time: number): void {
    const live = new Set(state.projectiles.map((p) => p.id));
    for (const orb of this.orbs) if (!live.has(orb.id)) orb.id = -1;
    for (const p of state.projectiles) {
      let orb = this.orbs.find((o) => o.id === p.id);
      if (!orb) {
        orb = this.orbs.find((o) => o.id === -1);
        if (!orb) continue;
        orb.id = p.id;
        orb.prev.set(p.pos.x - p.vel.x / 60, p.pos.y - p.vel.y / 60);
        orb.shell.material.color.set(this.fx.colourOf(p.owner));
      }
      const x = orb.prev.x + (p.pos.x - orb.prev.x) * alpha;
      const y = orb.prev.y + (p.pos.y - orb.prev.y) * alpha;
      orb.group.position.set(x, y, 0);
      orb.group.scale.setScalar(p.r * (1.15 + Math.sin(time * 30 + p.id) * 0.12));
      orb.group.rotation.set(time * 7, time * 5, 0);
      this.fx.ember(x, y, this.fx.colourOf(p.owner));
    }
    for (const orb of this.orbs) orb.group.visible = orb.id !== -1;
  }

  dispose(): void {
    this.core.dispose();
    this.coreMat.dispose();
    for (const orb of this.orbs) orb.shell.material.dispose();
  }
}
