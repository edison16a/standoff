import * as THREE from "three";
import type { Projectile } from "../../engine/projectiles";
import { flat, starShape } from "../models/geo";
import { softDot } from "../textures";

/**
 * Thrown power ups in flight: the Star Orb is a golden ball of light with
 * a spinning star inside, the Ice Blast a tumbling blue crystal. Meshes
 * are pooled by throw id and reused.
 */
export class ProjectileView {
  readonly group = new THREE.Group();
  private readonly live = new Map<number, THREE.Group>();
  private readonly orbGeo = new THREE.SphereGeometry(0.55, 20, 14);
  private readonly orbMat = new THREE.MeshBasicMaterial({ color: "#ffc53a", transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  private readonly starGeo = flat(starShape(0.42, 0.18), 0.12).center();
  private readonly starMat = new THREE.MeshBasicMaterial({ color: "#fff6c8", toneMapped: false });
  private readonly iceGeo = new THREE.OctahedronGeometry(0.6, 0);
  private readonly iceMat = new THREE.MeshStandardMaterial({ color: "#a8ecff", emissive: "#3ab8ff", emissiveIntensity: 0.8, transparent: true, opacity: 0.85, roughness: 0.05 });
  private readonly halo = new THREE.SpriteMaterial({ map: softDot("rgba(255,220,120,0.9)", "rgba(255,160,40,0)"), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  private readonly iceHalo = new THREE.SpriteMaterial({ map: softDot("rgba(160,235,255,0.9)", "rgba(60,160,255,0)"), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });

  private make(p: Projectile): THREE.Group {
    const g = new THREE.Group();
    if (p.kind === "orb") {
      g.add(new THREE.Mesh(this.orbGeo, this.orbMat), new THREE.Mesh(this.starGeo, this.starMat));
      const halo = new THREE.Sprite(this.halo);
      halo.scale.setScalar(3.2);
      g.add(halo);
    } else {
      const crystal = new THREE.Mesh(this.iceGeo, this.iceMat);
      crystal.scale.set(0.8, 0.8, 1.8);
      const halo = new THREE.Sprite(this.iceHalo);
      halo.scale.setScalar(2.6);
      g.add(crystal, halo);
    }
    this.group.add(g);
    return g;
  }

  /** Drops every throw on screen, for a new race. */
  clear(): void {
    for (const g of this.live.values()) this.group.remove(g);
    this.live.clear();
  }

  update(projectiles: readonly Projectile[], time: number): void {
    const seen = new Set<number>();
    for (const p of projectiles) {
      seen.add(p.id);
      let g = this.live.get(p.id);
      if (!g) {
        g = this.make(p);
        this.live.set(p.id, g);
      }
      g.position.set(p.x, p.y + Math.sin(time * 10 + p.id) * 0.1, p.z);
      g.rotation.set(0, p.heading, 0);
      const inner = g.children[p.kind === "orb" ? 1 : 0]!;
      if (p.kind === "orb") inner.rotation.set(0, time * 8, 0);
      else inner.rotation.set(0, 0, time * 9);
    }
    for (const [id, g] of this.live) {
      if (seen.has(id)) continue;
      this.group.remove(g);
      this.live.delete(id);
    }
  }

  dispose(): void {
    for (const item of [this.orbGeo, this.orbMat, this.starGeo, this.starMat, this.iceGeo, this.iceMat, this.halo, this.iceHalo]) item.dispose();
  }
}
