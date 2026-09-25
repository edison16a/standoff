import * as THREE from "three";
import { blockMaterial, setFog, spikeGeometry, spikeMaterial } from "./neon";
import { seeded } from "./random";
import { Sky } from "./sky";
import type { Theme } from "./themes";

/** One piece of skyline: where it stands, how big it is, and whether it is a pyramid. */
interface Piece {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  peak: boolean;
}

/** The skyline for a theme's style, spread along the whole level and a little past both ends. */
function skyline(theme: Theme, from: number, to: number, random: () => number): Piece[] {
  const pieces: Piece[] = [];
  const between = (a: number, b: number) => a + (b - a) * random();
  for (let x = from; x < to; ) {
    const z = between(-70, -32);
    switch (theme.skyline) {
      case "towers":
        pieces.push({ x, y: 0, z, w: between(3, 7), h: between(3, 13), peak: false });
        x += between(3, 8);
        break;
      case "dunes":
        pieces.push({ x, y: -1, z: z - 30, w: between(16, 30), h: between(5, 11), peak: true });
        x += between(10, 20);
        break;
      case "clouds":
        // High enough to sit above a corridor's ceiling on screen, so none is taken for a block in play.
        pieces.push({ x, y: between(14, 27), z, w: between(5, 12), h: between(1.2, 3), peak: false });
        pieces.push({ x: x + between(-2, 2), y: pieces.at(-1)!.y + between(1, 3), z: z + 0.5, w: between(3, 6), h: between(1, 2), peak: false });
        x += between(8, 16);
        break;
      case "circuits":
        pieces.push({ x, y: 0, z, w: between(6, 14), h: between(2, 9), peak: false });
        if (random() < 0.5) pieces.push({ x: x + between(-2, 2), y: 0, z: z - 1, w: 0.6, h: between(14, 26), peak: false });
        x += between(7, 14);
        break;
      case "spires":
        // Kept below the corridor on screen, so a dark spire never passes for a spike in play.
        pieces.push({ x, y: -1, z: z - 10, w: between(3, 7), h: between(5, 12), peak: true });
        x += between(4, 9);
        break;
    }
  }
  return pieces;
}

/**
 * Everything behind the play: the sky with its sun, a skyline far back,
 * shapes turning in the middle distance and dust drifting close by. The
 * camera's own perspective gives the layers their parallax.
 */
export class Backdrop {
  readonly group = new THREE.Group();
  private readonly sky: Sky;
  private readonly materials: THREE.ShaderMaterial[] = [];
  private readonly floaters: THREE.Mesh[] = [];
  private readonly disposables: { dispose(): void }[] = [];

  constructor(theme: Theme, length: number, seed = 7) {
    const random = seeded(seed);
    this.sky = new Sky(theme);
    this.group.add(this.sky.mesh);

    const pieces = skyline(theme, -150, length + 250, random);
    const boxes = pieces.filter((p) => !p.peak);
    const peaks = pieces.filter((p) => p.peak);
    const boxMaterial = blockMaterial(new THREE.Color(theme.fill).multiplyScalar(0.55).getHex(), theme.accent, 0.5);
    boxMaterial.uniforms.tile!.value = 0.03;
    boxMaterial.uniforms.windows!.value = theme.skyline === "clouds" ? 0 : 0.55;
    (boxMaterial.uniforms.windowColour!.value as THREE.Color).set(theme.sun);
    const peakMaterial = spikeMaterial(new THREE.Color(theme.fill).multiplyScalar(0.6).getHex(), theme.accent, 0.012);
    peakMaterial.uniforms.glow!.value = 0.55;
    for (const material of [boxMaterial, peakMaterial]) {
      // Fogged toward the dark of the sky, so the skyline stands as a silhouette against the glow at the horizon.
      setFog(material, new THREE.Color(theme.skyHigh).lerp(new THREE.Color(theme.skyLow), 0.25).getHex(), 0.012);
      this.materials.push(material);
    }
    const box = new THREE.BoxGeometry(1, 1, 1);
    const peak = spikeGeometry();
    const place = (geometry: THREE.BufferGeometry, material: THREE.Material, list: Piece[]) => {
      const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, list.length));
      mesh.count = list.length;
      mesh.frustumCulled = false;
      const matrix = new THREE.Matrix4();
      list.forEach((p, i) => {
        const y = geometry === box ? p.y + p.h / 2 : p.y;
        matrix.compose(new THREE.Vector3(p.x, y, p.z), new THREE.Quaternion(), new THREE.Vector3(p.w, p.h, p.w * 0.6));
        mesh.setMatrixAt(i, matrix);
      });
      this.group.add(mesh);
    };
    place(box, boxMaterial, boxes);
    place(peak, peakMaterial, peaks);

    const shape = new THREE.OctahedronGeometry(1, 0);
    const wire = new THREE.MeshBasicMaterial({ color: new THREE.Color(theme.accent).multiplyScalar(0.9), wireframe: true });
    for (let x = -60; x < length + 120; x += 22 + random() * 20) {
      const floater = new THREE.Mesh(shape, wire);
      floater.position.set(x, 9 + random() * 10, -26 - random() * 12);
      floater.scale.setScalar(0.6 + random() * 0.9);
      floater.rotation.set(random() * 3, random() * 3, 0);
      this.floaters.push(floater);
      this.group.add(floater);
    }
    this.disposables.push(box, peak, shape, wire, boxMaterial, peakMaterial, this.sky);
  }

  update(cameraX: number, horizon: number, time: number, pulse: number): void {
    this.sky.setHorizon(horizon);
    this.sky.update(cameraX, time, pulse);
    for (const material of this.materials) material.uniforms.pulse!.value = pulse * 0.7;
    this.floaters.forEach((floater, i) => {
      floater.rotation.y = time * (0.3 + (i % 3) * 0.15);
      floater.rotation.x = time * 0.2 + i;
    });
  }

  dispose(): void {
    for (const item of this.disposables) item.dispose();
  }
}
