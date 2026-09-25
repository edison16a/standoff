import * as THREE from "three";
import type { Surface } from "../engine/stages";
import type { Fighter } from "../engine/types";
import { CHARACTERS } from "../roster";
import { blobTexture } from "./effects/textures";

const additive = (colour: string, opacity: number) =>
  new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });

/**
 * Everything drawn round a fighter besides their body: the shadow on the
 * floor below, the marker over their head in the player's colour, the
 * shield bubble, the stars of a dizzy spell, the platform they respawn
 * on, and the ring that spins at their feet while the ult is ready.
 */
export class FighterExtras {
  readonly group = new THREE.Group();
  private readonly shadow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly marker: THREE.Mesh;
  private readonly bubble: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshBasicMaterial>;
  private readonly stars = new THREE.Group();
  private readonly platform = new THREE.Group();
  private readonly ultRing: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  private readonly height: number;

  constructor(f: Fighter, colour: string) {
    const p = CHARACTERS[f.character].physique;
    this.height = p.height;
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.marker = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.26, 3), new THREE.MeshBasicMaterial({ color: colour, toneMapped: false }));
    this.marker.rotation.x = Math.PI;
    this.bubble = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), additive(colour, 0.32));
    const starMat = new THREE.MeshBasicMaterial({ color: "#fde047", toneMapped: false });
    for (let i = 0; i < 3; i++) this.stars.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.09), starMat));
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.8, 0.14, 12), new THREE.MeshBasicMaterial({ color: "#fef9c3", toneMapped: false }));
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.06, 4, 24), additive(colour, 0.9));
    halo.rotation.x = Math.PI / 2;
    pad.position.y = -0.07;
    this.platform.add(pad, halo);
    this.ultRing = new THREE.Mesh(new THREE.TorusGeometry(p.width * 0.9, 0.05, 4, 20), additive(colour, 0.8));
    this.ultRing.rotation.x = Math.PI / 2;
    this.group.add(this.shadow, this.marker, this.bubble, this.stars, this.platform, this.ultRing);
  }

  update(f: Fighter, x: number, y: number, surfaces: readonly Surface[], time: number): void {
    const visible = f.action !== "dead" && f.action !== "out";
    this.group.visible = visible;
    if (!visible) return;
    const floor = floorBelow(surfaces, x, y);
    this.shadow.visible = floor !== null;
    if (floor !== null) {
      const fade = Math.max(0.15, 1 - (y - floor) / 7);
      this.shadow.position.set(x, floor + 0.02, 0);
      this.shadow.scale.setScalar(this.height * 0.75 * fade);
      this.shadow.material.opacity = fade;
    }
    this.marker.position.set(x, y + this.height + 0.55 + Math.sin(time * 4) * 0.06, 0);
    this.marker.rotation.y = time * 2;
    const shielding = f.action === "shield";
    this.bubble.visible = shielding;
    if (shielding) {
      this.bubble.position.set(x, y + this.height * 0.5, 0);
      this.bubble.scale.setScalar(this.height * (0.32 + 0.3 * f.shield));
      this.bubble.material.opacity = 0.18 + 0.2 * f.shield;
    }
    this.stars.visible = f.action === "dizzy";
    if (this.stars.visible) {
      this.stars.children.forEach((star, i) => {
        const a = time * 5 + (i * Math.PI * 2) / 3;
        star.position.set(x + Math.cos(a) * 0.4, y + this.height + 0.1 + Math.sin(a * 2) * 0.05, Math.sin(a) * 0.4);
        star.rotation.y = a * 2;
      });
    }
    this.platform.visible = f.action === "respawn" && f.platform !== null;
    if (f.platform) this.platform.position.set(f.platform.x, f.platform.y, 0);
    this.ultRing.visible = f.ult >= 1 && f.action !== "respawn";
    if (this.ultRing.visible) {
      this.ultRing.position.set(x, y + 0.05 + (Math.sin(time * 3) * 0.5 + 0.5) * this.height * 0.8, 0);
      this.ultRing.material.opacity = 0.5 + Math.sin(time * 9) * 0.3;
    }
  }

  dispose(): void {
    this.group.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.geometry.dispose();
      const m = o.material as THREE.MeshBasicMaterial;
      m.map?.dispose();
      m.dispose();
    });
  }
}

/** The top of the highest floor under a point, or null over the void. */
export function floorBelow(surfaces: readonly Surface[], x: number, y: number): number | null {
  let best: number | null = null;
  for (const s of surfaces) {
    if (x < s.x1 || x > s.x2 || s.top > y + 0.05) continue;
    if (best === null || s.top > best) best = s.top;
  }
  return best;
}
