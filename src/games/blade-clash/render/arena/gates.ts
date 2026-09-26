import * as THREE from "three";
import type { Slot } from "@/games/blade-clash/players";
import { disposeOwned, MeshBuilder } from "../kit/mesh-builder";
import { glow, metal } from "../kit/materials";
import { PLAYER_COLOURS } from "../player-colours";
import type { ArenaTheme } from "./arena-theme";
import { bannerTexture, blockTexture } from "./arena-textures";
import type { FlameSpot } from "./fire";
import { STANDS } from "./stands";

const TOWER = { width: 7.4, depth: 3, height: 9.5 };
const ARCH = { width: 3.2, height: 4.6 };

/** A flag that ripples along its length, in the vertex shader. */
function flagMaterial(color: number, uniforms: { uTime: { value: number } }): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.8, side: THREE.DoubleSide });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nfloat along = max(0.0, position.x);\ntransformed.z += sin(along * 3.0 - uTime * 0.005) * 0.12 * along;");
  };
  return material;
}

/**
 * The two great gates at the ends of the fighting line, one behind each
 * player: a stone tower with a dark archway and portcullis, a banner in
 * that player's colour, torches either side and flags flying from the
 * top. So each player looks down the line past their opponent at the
 * opponent's own gate.
 */
export class Gates {
  readonly group = new THREE.Group();
  /** Where the torches on the gates burn, for the arena's flames. */
  readonly flames: FlameSpot[] = [];
  private readonly flagTime = { uTime: { value: 0 } };

  constructor(theme: ArenaTheme) {
    const blocks = blockTexture(theme.stone).clone();
    blocks.repeat.set(2, 2);
    blocks.needsUpdate = true;
    const stone = new THREE.MeshStandardMaterial({ map: blocks, color: 0xffffff, roughness: 0.9 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x0b0906, roughness: 1 });
    const iron = metal(0x2a2c30, 0.55);
    for (const slot of [1, 2] as const) this.group.add(this.tower(slot, stone, dark, iron, theme));
  }

  update(t: number): void {
    this.flagTime.uTime.value = t;
  }

  dispose(): void {
    disposeOwned(this.group);
  }

  /** One gate, built facing -x at the +x end, then turned round for player one's end. */
  private tower(slot: Slot, stone: THREE.Material, dark: THREE.Material, iron: THREE.Material, theme: ArenaTheme): THREE.Group {
    const group = new THREE.Group();
    const b = new MeshBuilder();
    const front = STANDS.radius - 0.4;
    const { width, depth, height } = TOWER;
    b.box(depth, height, width, stone, [front + depth / 2, height / 2, 0]);
    // Crenellations along the top.
    for (let z = -width / 2 + 0.4; z <= width / 2 - 0.3; z += 1) b.box(depth * 0.9, 0.7, 0.55, stone, [front + depth / 2, height + 0.35, z]);
    // The archway: a dark opening with a round top, and the portcullis across it.
    b.box(0.1, ARCH.height - ARCH.width / 2, ARCH.width, dark, [front - 0.02, (ARCH.height - ARCH.width / 2) / 2, 0]);
    b.cylinder(ARCH.width / 2, ARCH.width / 2, 0.1, dark, [front - 0.02, ARCH.height - ARCH.width / 2, 0], [0, 0, Math.PI / 2], 24);
    for (let z = -ARCH.width / 2 + 0.25; z < ARCH.width / 2; z += 0.32) b.box(0.06, ARCH.height - 0.3, 0.05, iron, [front - 0.08, (ARCH.height - 0.3) / 2, z]);
    for (let y = 0.5; y < ARCH.height - 0.6; y += 0.55) b.box(0.06, 0.05, ARCH.width - 0.2, iron, [front - 0.09, y, 0]);
    // Torch brackets either side of the arch.
    for (const z of [-1, 1]) {
      b.cylinder(0.08, 0.05, 0.4, iron, [front - 0.2, 3.1, z * (ARCH.width / 2 + 0.7)], [0, 0, 0], 10);
      b.sphere(0.12, glow(0xff9a3c, theme.fire * 2), [front - 0.2, 3.32, z * (ARCH.width / 2 + 0.7)], [1, 0.5, 1], 10);
    }
    group.add(b.build(`gate-${slot}`));

    // The player's banner over the arch.
    const colour = `#${PLAYER_COLOURS[slot].toString(16).padStart(6, "0")}`;
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.4), new THREE.MeshStandardMaterial({ map: bannerTexture(colour, "#ffd76a"), roughness: 0.85, side: THREE.DoubleSide }));
    banner.position.set(front - 0.06, ARCH.height + 2.3, 0);
    banner.rotation.y = -Math.PI / 2;
    group.add(banner);

    // Flags flying from poles on the corners of the tower.
    const flag = flagMaterial(PLAYER_COLOURS[slot], this.flagTime);
    for (const z of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.2, 8), iron);
      pole.position.set(front + 0.4, height + 1.6, z * (width / 2 - 0.4));
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1, 12, 1).translate(0.9, 0, 0), flag);
      cloth.position.set(front + 0.4, height + 2.6, z * (width / 2 - 0.4));
      cloth.rotation.y = z * 0.4 + Math.PI;
      group.add(pole, cloth);
    }

    if (slot === 1) group.rotation.y = Math.PI;
    const sign = slot === 1 ? -1 : 1;
    for (const z of [-1, 1]) this.flames.push({ at: new THREE.Vector3(sign * (front - 0.2), 3.3, z * sign * (ARCH.width / 2 + 0.7)), size: 0.55 });
    return group;
  }
}
