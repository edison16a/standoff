import * as THREE from "three";

/** How long a sweep of the blade stays visible, on the game clock. */
export const TRAIL_MS = 280;
const MAX_SAMPLES = 64;

interface Sample {
  tip: THREE.Vector3;
  mid: THREE.Vector3;
  t: number;
}

/**
 * A ribbon of light swept by the blade, from its middle to its tip, fading
 * out behind it. Every jab, parry and flick of the phone leaves one, in the
 * player's colour. Samples carry the game clock, so the ribbon lingers in
 * slow motion like everything else.
 */
export class BladeTrail {
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private samples: Sample[] = [];
  private readonly positions = new Float32Array(MAX_SAMPLES * 2 * 3);
  private readonly colours = new Float32Array(MAX_SAMPLES * 2 * 4);
  private readonly colour: THREE.Color;

  constructor(colour: THREE.ColorRepresentation) {
    this.colour = new THREE.Color(colour);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("color", new THREE.BufferAttribute(this.colours, 4).setUsage(THREE.DynamicDrawUsage));
    const index: number[] = [];
    for (let i = 0; i < MAX_SAMPLES - 1; i++) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geometry.setIndex(index);
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
  }

  add(tip: THREE.Vector3, mid: THREE.Vector3, t: number): void {
    const last = this.samples.at(-1);
    // Time running backwards means a new bout: the old trail belongs to another moment.
    if (last && t < last.t) this.samples = [];
    if (last && t === last.t) return;
    this.samples.push({ tip: tip.clone(), mid: mid.clone(), t });
    while (this.samples.length > MAX_SAMPLES || (this.samples.length > 0 && t - this.samples[0]!.t > TRAIL_MS)) this.samples.shift();
  }

  clear(): void {
    this.samples = [];
  }

  update(now: number): void {
    const { samples, positions, colours, colour } = this;
    const geometry = this.mesh.geometry;
    samples.forEach((sample, i) => {
      const life = Math.max(0, 1 - (now - sample.t) / TRAIL_MS);
      // A still blade leaves nothing: the ribbon shows movement, not the sword.
      const next = samples[i + 1] ?? sample;
      const speed = Math.min(1, Math.max(0, next.tip.distanceTo(sample.tip) * 25 - 0.15));
      const alpha = life * life * speed * 0.6;
      positions.set([sample.mid.x, sample.mid.y, sample.mid.z, sample.tip.x, sample.tip.y, sample.tip.z], i * 6);
      colours.set([colour.r, colour.g, colour.b, alpha * 0.15, 1, 1, 1, alpha * 0.95], i * 8);
      colours[i * 8 + 4] = colour.r * 0.5 + 0.5;
      colours[i * 8 + 5] = colour.g * 0.5 + 0.5;
      colours[i * 8 + 6] = colour.b * 0.5 + 0.5;
    });
    geometry.setDrawRange(0, Math.max(0, samples.length - 1) * 6);
    geometry.attributes.position!.needsUpdate = true;
    geometry.attributes.color!.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
