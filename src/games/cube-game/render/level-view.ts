import * as THREE from "three";
import type { Level } from "../engine/types";
import { blockMaterial, setFog, spikeGeometry, spikeMaterial } from "./neon";
import { Floor } from "./floor";
import { Gadgets } from "./gadgets";
import type { Theme } from "./themes";

/** How deep blocks are toward the camera. The play happens on z = 0. */
const DEPTH = 1;
/** The floor's front face reaches this far down, below anything the camera shows. */
const GROUND_DEPTH = 8;

function instanced(geometry: THREE.BufferGeometry, material: THREE.Material, count: number): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, count));
  mesh.count = count;
  mesh.frustumCulled = false;
  return mesh;
}

/**
 * Everything of a level that the players meet, built once per level:
 * the blocks and floor in the neon shader, spikes as glowing pyramids,
 * and the pads, orbs, portals and gates. `update` makes it pulse.
 */
export class LevelView {
  readonly group = new THREE.Group();
  private readonly materials: THREE.ShaderMaterial[] = [];
  private readonly floor: Floor;
  private readonly gadgets: Gadgets;
  private readonly geometries: THREE.BufferGeometry[] = [];

  constructor(level: Level, theme: Theme) {
    const box = new THREE.BoxGeometry(1, 1, 1);
    const spike = spikeGeometry();
    this.geometries.push(box, spike);
    const blockMat = blockMaterial(theme.fill, theme.edge);
    const groundMat = blockMaterial(new THREE.Color(theme.fill).multiplyScalar(0.7).getHex(), theme.edge, 1.1);
    groundMat.uniforms.tile!.value = 0.05;
    const spikeMat = spikeMaterial(theme.fill, theme.spike);
    this.materials.push(blockMat, groundMat, spikeMat);
    for (const material of this.materials) setFog(material, theme.skyLow, 0.004);

    const matrix = new THREE.Matrix4();
    const at = new THREE.Vector3();
    const size = new THREE.Vector3();
    const turn = new THREE.Quaternion();

    const blocks = level.solids.filter((s) => s.kind !== "ground");
    const blockMesh = instanced(box, blockMat, blocks.length);
    blocks.forEach((s, i) => blockMesh.setMatrixAt(i, matrix.compose(at.set(s.x + s.w / 2, s.y + s.h / 2, 0), turn, size.set(s.w, s.h, DEPTH))));

    const grounds = level.solids.filter((s) => s.kind === "ground");
    const groundMesh = instanced(box, groundMat, grounds.length);
    grounds.forEach((s, i) =>
      groundMesh.setMatrixAt(i, matrix.compose(at.set(s.x + s.w / 2, -GROUND_DEPTH / 2, 0), turn, size.set(s.w, GROUND_DEPTH, DEPTH))),
    );

    const spikeMesh = instanced(spike, spikeMat, level.spikes.length);
    const down = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
    level.spikes.forEach((s, i) => {
      const q = s.dir === 1 ? turn : down;
      spikeMesh.setMatrixAt(i, matrix.compose(at.set(s.x + 0.5, s.y, 0), q, size.set(1, 1, 1)));
    });

    this.floor = new Floor(grounds, theme);
    this.gadgets = new Gadgets(level, theme);
    this.group.add(blockMesh, groundMesh, spikeMesh, this.floor.group, this.gadgets.group);
  }

  /** `pulse` is 1 on the beat and fades to 0 before the next one. */
  update(time: number, pulse: number): void {
    for (const material of this.materials) material.uniforms.pulse!.value = pulse;
    this.floor.update(pulse);
    this.gadgets.update(time, pulse);
  }

  /** Lights up gadgets a player has used, for the view being drawn. */
  showUsed(used: { pads: ReadonlySet<object>; orbs: ReadonlySet<object> } | null): void {
    this.gadgets.showUsed(used);
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.floor.dispose();
    this.gadgets.dispose();
  }
}
