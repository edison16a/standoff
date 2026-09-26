import * as THREE from "three";
import { LINE_HALF_LENGTH, START_X } from "@/games/blade-clash/engine/rules";
import type { Slot } from "@/games/blade-clash/players";
import { disposeOwned, MeshBuilder } from "../kit/mesh-builder";
import { glow, metal, own } from "../kit/materials";
import { PLAYER_COLOURS } from "../player-colours";
import type { ArenaTheme } from "./arena-theme";
import { blockTexture, flagstoneTexture } from "./arena-textures";

/** The dais's top, where the fighters stand. */
export const FLOOR = 0.32;
const HALF_LENGTH = LINE_HALF_LENGTH + 1.9;
const HALF_WIDTH = 2.6;

/** A flat slab with rounded corners, from the floor up to `height`. */
function slab(halfLength: number, halfWidth: number, corner: number, height: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const [x, y, r] = [halfLength, halfWidth, corner];
  shape.moveTo(-x + r, -y);
  shape.lineTo(x - r, -y);
  shape.quadraticCurveTo(x, -y, x, -y + r);
  shape.lineTo(x, y - r);
  shape.quadraticCurveTo(x, y, x - r, y);
  shape.lineTo(-x + r, y);
  shape.quadraticCurveTo(-x, y, -x, y - r);
  shape.lineTo(-x, -y + r);
  shape.quadraticCurveTo(-x, -y, -x + r, -y);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 8 });
  // Extruded along z, turned to stand on the floor with the shape lying flat.
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -0.03, 0);
  return geometry;
}

/**
 * The duelling dais in the middle of the arena: a raised stone platform
 * on a broader step, with a line of gold inlaid down its middle where the
 * fighters walk, marks where each starts, a ring at the centre and a
 * stone post at each corner topped with a lamp in the player's colour.
 * A hit lights the hitter's lamps.
 */
export class Dais {
  readonly group = new THREE.Group();
  private readonly lamps: Record<Slot, THREE.MeshStandardMaterial>;
  private readonly flare = { 1: 0, 2: 0 };

  constructor(theme: ArenaTheme) {
    const top = flagstoneTexture(theme.dais).clone();
    top.repeat.set(0.5, 0.5);
    top.needsUpdate = true;
    const sides = blockTexture(theme.stoneDark).clone();
    sides.repeat.set(0.5, 0.5);
    sides.needsUpdate = true;
    const dais = new THREE.Mesh(slab(HALF_LENGTH, HALF_WIDTH, 1.1, FLOOR), new THREE.MeshStandardMaterial({ map: top, color: 0xffffff, roughness: 0.78 }));
    const step = new THREE.Mesh(slab(HALF_LENGTH + 0.6, HALF_WIDTH + 0.6, 1.5, FLOOR * 0.5), new THREE.MeshStandardMaterial({ map: sides, color: 0xd8d0c4, roughness: 0.85 }));
    dais.receiveShadow = step.receiveShadow = true;
    dais.castShadow = true;
    this.group.add(step, dais);

    const b = new MeshBuilder();
    const line = glow(theme.line, theme.dark ? 2.2 : 1.2);
    b.box(LINE_HALF_LENGTH * 2, 0.006, 0.05, line, [0, FLOOR + 0.003, 0]);
    for (const x of [-START_X, START_X]) b.box(0.05, 0.006, 0.9, line, [x, FLOOR + 0.003, 0]);
    for (const x of [-LINE_HALF_LENGTH, LINE_HALF_LENGTH]) b.box(0.08, 0.006, 1.4, line, [x, FLOOR + 0.003, 0]);
    // A ring of brass set in the stone at the centre: it catches the light but does not glow.
    const brass = metal(0xb58d3a, 0.4);
    b.add(new THREE.RingGeometry(0.64, 0.68, 64), brass, [0, FLOOR + 0.004, 0], [-Math.PI / 2, 0, 0]);
    b.add(new THREE.RingGeometry(0.1, 0.15, 4), brass, [0, FLOOR + 0.004, 0], [-Math.PI / 2, 0, Math.PI / 4]);
    this.group.add(b.build("dais-line", false));

    // Corner posts, each crowned with its player's lamp: player one's at their end, player two's at theirs.
    this.lamps = { 1: own(glow(PLAYER_COLOURS[1], 2)), 2: own(glow(PLAYER_COLOURS[2], 2)) };
    const posts = new MeshBuilder();
    const stone = new THREE.MeshStandardMaterial({ map: sides, color: 0xe6ddd0, roughness: 0.8 });
    for (const slot of [1, 2] as const) {
      const x = (slot === 1 ? -1 : 1) * (HALF_LENGTH - 0.45);
      for (const z of [-1, 1]) {
        posts.box(0.34, 1.1, 0.34, stone, [x, FLOOR + 0.55, z * (HALF_WIDTH - 0.4)], [0, 0, 0], 0.03);
        posts.box(0.42, 0.08, 0.42, stone, [x, FLOOR + 1.12, z * (HALF_WIDTH - 0.4)], [0, 0, 0], 0.02);
        posts.sphere(0.12, this.lamps[slot], [x, FLOOR + 1.28, z * (HALF_WIDTH - 0.4)], [1, 1, 1], 16);
      }
    }
    this.group.add(posts.build("dais-posts"));
  }

  /** Lights up the hitter's lamps. */
  flash(slot: Slot): void {
    this.flare[slot] = 1;
  }

  update(dtMs: number): void {
    for (const slot of [1, 2] as const) {
      this.flare[slot] *= Math.exp(-dtMs / 600);
      this.lamps[slot].emissiveIntensity = 2 + this.flare[slot] * 8;
    }
  }

  dispose(): void {
    disposeOwned(this.group);
  }
}
