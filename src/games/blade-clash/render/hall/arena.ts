import * as THREE from "three";
import { disposeOwned, MeshBuilder } from "../kit/mesh-builder";
import { metal } from "../kit/materials";
import type { HallTheme } from "./hall-theme";
import { bannerTexture, boardTexture, woodTexture } from "./hall-textures";

const BACK_WALL = -12.8;
const SIDE_WALL = 19;
const CEILING = 10;
/** The ribbon board runs along the front of the stands. */
const BOARD_Z = -4.75;

/**
 * The room around the strip: a maple floor, the walls with tall windows
 * and hanging banners, roof trusses, and the glowing ribbon board along
 * the front of the stands, its words sliding slowly past.
 */
export class Arena {
  readonly group = new THREE.Group();
  private readonly board: THREE.CanvasTexture;

  constructor(theme: HallTheme) {
    const wood = woodTexture();
    wood.repeat.set(10, 7);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(SIDE_WALL * 2, 34),
      new THREE.MeshStandardMaterial({ map: wood, color: theme.floor, roughness: 0.45, metalness: 0.05 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = 4;
    floor.receiveShadow = true;
    this.group.add(floor);

    const b = new MeshBuilder();
    const wall = new THREE.MeshStandardMaterial({ color: theme.wall, roughness: 0.9 });
    const trim = new THREE.MeshStandardMaterial({ color: theme.wallTrim, roughness: 0.6 });
    b.box(SIDE_WALL * 2, CEILING, 0.3, wall, [0, CEILING / 2, BACK_WALL]);
    for (const side of [-1, 1]) b.box(0.3, CEILING, 34, wall, [side * SIDE_WALL, CEILING / 2, 4]);
    b.box(SIDE_WALL * 2, 0.5, 0.32, trim, [0, 6.2, BACK_WALL + 0.02]);
    // Roof trusses: a lattice of steel above the lights.
    const steel = metal(theme.dark ? 0x2a2e3a : 0x9aa0a8, 0.5);
    for (const z of [-9, -4, 1, 6]) {
      b.box(SIDE_WALL * 2, 0.12, 0.12, steel, [0, 8.6, z]);
      b.box(SIDE_WALL * 2, 0.12, 0.12, steel, [0, 9.4, z]);
      for (let x = -SIDE_WALL + 1; x < SIDE_WALL; x += 1.6) b.rod([x, 8.6, z], [x + 0.8, 9.4, z], 0.03, steel, 5);
    }
    this.group.add(b.build("arena", false));

    // Tall windows glowing with daylight, dimmed to night blue in the evening.
    const pane = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: theme.dark ? 0x1b2750 : 0xfff6e0, emissiveIntensity: theme.windows });
    const windows = new MeshBuilder();
    for (let x = -16; x <= 16; x += 4) windows.box(2.2, 2.6, 0.05, pane, [x, 7.6, BACK_WALL + 0.18]);
    this.group.add(windows.build("windows", false));

    // Banners in the players' colours and the hall's own.
    const banners: [string, string, string][] = [["FIGHT", "#ff4757", "#ffffff"], ["CLASH", "#1d3557", "#ffd23f"], ["STANDOFF", "#5b3cc4", "#ffffff"], ["BLADE CLASH", "#ff8a1f", "#1c1030"]];
    banners.forEach(([word, background, ink], i) => {
      for (const side of [-1, 1]) {
        const x = side * (4 + i * 3.2);
        const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 4.2), new THREE.MeshStandardMaterial({ map: bannerTexture(word, background, ink), roughness: 0.8, side: THREE.DoubleSide }));
        banner.position.set(x, 5.2, BACK_WALL + 0.3);
        this.group.add(banner);
      }
    });

    this.board = boardTexture(theme.dark ? "#ffd23f" : "#5fa8ff").clone();
    this.board.repeat.set(5, 1);
    this.board.needsUpdate = true;
    const boardFace = new THREE.Mesh(
      new THREE.PlaneGeometry(SIDE_WALL * 2 - 6, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: this.board, emissiveIntensity: theme.boardGlow, roughness: 0.5 }),
    );
    boardFace.position.set(0, 0.62, BOARD_Z + 0.16);
    const boardBody = new THREE.Mesh(new THREE.BoxGeometry(SIDE_WALL * 2 - 5.8, 0.95, 0.3), new THREE.MeshStandardMaterial({ color: 0x14151d, roughness: 0.6 }));
    boardBody.position.set(0, 0.475, BOARD_Z);
    boardBody.receiveShadow = true;
    this.group.add(boardFace, boardBody);
  }

  update(t: number): void {
    this.board.offset.x = (t / 60000) % 1;
  }

  dispose(): void {
    disposeOwned(this.group);
    this.board.dispose();
  }
}
