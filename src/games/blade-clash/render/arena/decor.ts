import * as THREE from "three";
import { disposeOwned, MeshBuilder } from "../kit/mesh-builder";
import { glow, metal } from "../kit/materials";
import type { ArenaTheme } from "./arena-theme";
import { bannerTexture, blockTexture } from "./arena-textures";
import type { FlameSpot } from "./fire";
import { GATE_GAP, STANDS } from "./stands";

/** The big fire bowls at the dais's four corners, and how high their flames start. */
export const BRAZIERS = [-1, 1].flatMap((x) => [-1, 1].map((z) => new THREE.Vector3(x * 8.2, 0, z * 3.9)));
const BRAZIER_TOP = 1.25;
/** Banners round the arena wall: the hall's own colours between the players'. */
const BANNERS: [string, string][] = [["#5b3cc4", "#ffd76a"], ["#1d3557", "#ffd76a"], ["#8e1b1b", "#ffd76a"], ["#ff8a1f", "#1c1030"]];

/**
 * The arena wall's dressing and the dais's fires: tall banners hanging
 * round the wall with torches between them, and four braziers roaring at
 * the corners of the dais.
 */
export class Decor {
  readonly group = new THREE.Group();
  readonly flames: FlameSpot[] = [];

  constructor(theme: ArenaTheme) {
    const b = new MeshBuilder();
    const iron = metal(0x2a2c30, 0.55);
    const coals = glow(0xff6a1a, theme.fire * 2.5);
    const blocks = blockTexture(theme.stoneDark).clone();
    blocks.needsUpdate = true;
    const stone = new THREE.MeshStandardMaterial({ map: blocks, color: 0xffffff, roughness: 0.9 });

    // Braziers: a stone pedestal, an iron bowl of glowing coals, and a big flame.
    for (const at of BRAZIERS) {
      b.cylinder(0.3, 0.38, 0.9, stone, [at.x, 0.45, at.z], [0, 0, 0], 12);
      b.lathe([[0.12, 0.9], [0.4, 1.08], [0.52, 1.28], [0.5, 1.3], [0.36, 1.12], [0, 1.1]], iron, [at.x, 0, at.z], [1, 1, 1], 20);
      b.cylinder(0.44, 0.44, 0.06, coals, [at.x, 1.2, at.z], [0, 0, 0], 20);
      this.flames.push({ at: new THREE.Vector3(at.x, BRAZIER_TOP, at.z), size: 1.5 });
    }

    // Round the wall: a banner every so often, a torch between each pair, none across the gates.
    const count = 28;
    const wall = STANDS.radius - 0.05;
    let banner = 0;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.PI / count;
      const fromGate = Math.min(...[Math.PI / 2, (3 * Math.PI) / 2, (5 * Math.PI) / 2].map((g) => Math.abs(a - g)));
      if (fromGate < GATE_GAP + 0.12) continue;
      const [x, z] = [Math.sin(a), Math.cos(a)];
      if (i % 2 === 0) {
        const [field, ink] = BANNERS[banner++ % BANNERS.length]!;
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.9), new THREE.MeshStandardMaterial({ map: bannerTexture(field, ink), roughness: 0.85 }));
        cloth.position.set(x * wall, 1.95, z * wall);
        cloth.lookAt(0, 1.95, 0);
        this.group.add(cloth);
        b.box(0.08, 0.08, 1.4, iron, [x * (wall - 0.05), 3.42, z * (wall - 0.05)], [0, a + Math.PI / 2, 0]);
      } else {
        const r = wall - 0.25;
        b.cylinder(0.07, 0.04, 0.35, iron, [x * r, 2.6, z * r], [0, 0, 0], 8);
        b.box(0.05, 0.05, 0.3, iron, [x * (r + 0.13), 2.5, z * (r + 0.13)], [0, a, 0]);
        this.flames.push({ at: new THREE.Vector3(x * r, 2.76, z * r), size: 0.5 });
      }
    }
    this.group.add(b.build("decor"));
  }

  dispose(): void {
    disposeOwned(this.group);
  }
}
