import * as THREE from "three";
import type { TrailStyle } from "../fighter/characters";

const MAX_SAMPLES = 64;
/** A little past white at its brightest, so the bloom lifts the streak without turning a sweep into a sheet of light. */
const TRAIL_GLOW = 1.7;
/** The pixel sword's trail keeps one sample in this many milliseconds, so it moves in blocky jumps. */
const PIXEL_STEP_MS = 45;

interface Sample {
  tip: THREE.Vector3;
  mid: THREE.Vector3;
  t: number;
}

/**
 * A ribbon of light swept by the outer blade, bright close behind the
 * tip and fading out behind it. Each weapon streaks in its own way: pale
 * steel for the longsword, a thin white arc for the katana, a stepped
 * pink ribbon for the pixel sword and a wide glow in the player's colour
 * for the energy blade. Samples carry the game clock, so the ribbon
 * lingers in slow motion like everything else.
 */
export class BladeTrail {
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private samples: Sample[] = [];
  private readonly positions = new Float32Array(MAX_SAMPLES * 2 * 3);
  private readonly colours = new Float32Array(MAX_SAMPLES * 2 * 4);
  private readonly colour = new THREE.Color();
  private readonly inner = new THREE.Vector3();
  private style: TrailStyle | null = null;

  constructor(private readonly playerColour: THREE.ColorRepresentation) {
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

  /** Switches to a weapon's look. A new weapon starts with a clean trail. */
  setStyle(style: TrailStyle | null): void {
    if (style === this.style) return;
    this.style = style;
    this.samples = [];
    this.colour.set(style?.colour ?? this.playerColour);
  }

  add(tip: THREE.Vector3, mid: THREE.Vector3, t: number): void {
    const last = this.samples.at(-1);
    // Time running backwards means a new bout: the old trail belongs to another moment.
    if (last && t < last.t) this.samples = [];
    if (last && t - last.t < (this.style?.pixel ? PIXEL_STEP_MS : 0.5)) return;
    this.samples.push({ tip: tip.clone(), mid: mid.clone(), t });
    const life = this.style?.lifeMs ?? 250;
    while (this.samples.length > MAX_SAMPLES || (this.samples.length > 0 && t - this.samples[0]!.t > life)) this.samples.shift();
  }

  clear(): void {
    this.samples = [];
  }

  update(now: number): void {
    const style = this.style;
    const { samples, positions, colours, colour, inner } = this;
    const geometry = this.mesh.geometry;
    if (!style) {
      geometry.setDrawRange(0, 0);
      return;
    }
    const hot = TRAIL_GLOW * style.strength;
    samples.forEach((sample, i) => {
      let life = Math.max(0, 1 - (now - sample.t) / style.lifeMs);
      // The pixel trail fades in hard steps, like an old game's palette.
      if (style.pixel) life = Math.ceil(life * 4) / 4;
      // A still blade leaves nothing: the ribbon shows movement, not the sword.
      const next = samples[i + 1] ?? sample;
      const gap = (next.t - sample.t) || 16;
      const speed = Math.min(1, Math.max(0, (next.tip.distanceTo(sample.tip) / gap) * 400 - 0.15));
      const alpha = life ** (style.pixel ? 1 : 3) * speed * 0.6;
      inner.copy(sample.tip).lerp(sample.mid, style.depth / 0.45);
      positions.set([inner.x, inner.y, inner.z, sample.tip.x, sample.tip.y, sample.tip.z], i * 6);
      colours.set([colour.r * hot, colour.g * hot, colour.b * hot, 0], i * 8);
      colours.set([(colour.r * 0.5 + 0.5) * hot, (colour.g * 0.5 + 0.5) * hot, (colour.b * 0.5 + 0.5) * hot, alpha], i * 8 + 4);
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
