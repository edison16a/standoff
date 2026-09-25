import * as THREE from "three";
import { glowTexture } from "../kit/textures";
import { GLOW } from "./glow";

const MAX = 700;
const GRAVITY = -9.8;

interface Spark {
  p: THREE.Vector3;
  v: THREE.Vector3;
  born: number;
  life: number;
  hot: THREE.Color;
}

export interface BurstOptions {
  count: number;
  speed: number;
  lifeMs: number;
  colour?: THREE.ColorRepresentation;
  /** Throws the burst mostly this way, instead of all round. */
  toward?: THREE.Vector3;
}

/**
 * Hot metal flying off the blades: streaks of light that arc under gravity
 * and cool from white through yellow to orange as they die. All of them are
 * one line segments mesh. They run on the game clock, so they hang in the
 * air through the slow motion.
 */
export class Sparks {
  readonly mesh: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  /** A small glow at the head of every spark. */
  readonly heads: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private sparks: Spark[] = [];
  private readonly positions = new Float32Array(MAX * 6);
  private readonly colours = new Float32Array(MAX * 8);
  private readonly headPositions = new Float32Array(MAX * 3);
  private readonly headColours = new Float32Array(MAX * 4);
  private lastT: number | null = null;

  constructor(private readonly random: () => number) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("color", new THREE.BufferAttribute(this.colours, 4).setUsage(THREE.DynamicDrawUsage));
    this.mesh = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
    const heads = new THREE.BufferGeometry();
    heads.setAttribute("position", new THREE.BufferAttribute(this.headPositions, 3).setUsage(THREE.DynamicDrawUsage));
    heads.setAttribute("color", new THREE.BufferAttribute(this.headColours, 4).setUsage(THREE.DynamicDrawUsage));
    this.heads = new THREE.Points(heads, new THREE.PointsMaterial({
      size: 0.045, map: glowTexture(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    this.heads.frustumCulled = false;
    this.heads.renderOrder = 4;
    // Nothing is drawn until the first sparks fly.
    geometry.setDrawRange(0, 0);
    heads.setDrawRange(0, 0);
    this.mesh.add(this.heads);
  }

  burst(at: THREE.Vector3, t: number, options: BurstOptions): void {
    const hot = new THREE.Color(options.colour ?? 0xffc34d);
    for (let i = 0; i < options.count && this.sparks.length < MAX; i++) {
      const dir = new THREE.Vector3(this.random() * 2 - 1, this.random() * 2 - 0.6, this.random() * 2 - 1).normalize();
      if (options.toward) dir.addScaledVector(options.toward, 1.2).normalize();
      const speed = options.speed * (0.35 + this.random() * 0.65);
      this.sparks.push({ p: at.clone(), v: dir.multiplyScalar(speed), born: t, life: options.lifeMs * (0.5 + this.random() * 0.5), hot });
    }
  }

  update(t: number): void {
    const dt = this.lastT === null || t < this.lastT ? 0 : Math.min(0.05, (t - this.lastT) / 1000);
    this.lastT = t;
    this.sparks = this.sparks.filter((spark) => t - spark.born < spark.life && t >= spark.born);
    const white = new THREE.Color(1, 1, 0.92);
    const colour = new THREE.Color();
    this.sparks.forEach((spark, i) => {
      spark.v.y += GRAVITY * dt;
      spark.v.multiplyScalar(Math.exp(-dt * 1.6));
      spark.p.addScaledVector(spark.v, dt);
      const age = (t - spark.born) / spark.life;
      const tail = spark.p.clone().addScaledVector(spark.v, -0.022);
      this.positions.set([spark.p.x, spark.p.y, spark.p.z, tail.x, tail.y, tail.z], i * 6);
      colour.copy(white).lerp(spark.hot, Math.min(1, age * 1.8)).multiplyScalar(GLOW);
      const alpha = 1 - age;
      this.colours.set([colour.r, colour.g, colour.b, alpha, colour.r, colour.g * 0.7, colour.b * 0.4, 0], i * 8);
      this.headPositions.set([spark.p.x, spark.p.y, spark.p.z], i * 3);
      this.headColours.set([colour.r, colour.g, colour.b, alpha], i * 4);
    });
    const heads = this.heads.geometry;
    heads.setDrawRange(0, this.sparks.length);
    heads.attributes.position!.needsUpdate = true;
    heads.attributes.color!.needsUpdate = true;
    const geometry = this.mesh.geometry;
    geometry.setDrawRange(0, this.sparks.length * 2);
    geometry.attributes.position!.needsUpdate = true;
    geometry.attributes.color!.needsUpdate = true;
  }

  get count(): number {
    return this.sparks.length;
  }

  clear(): void {
    this.sparks = [];
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.heads.geometry.dispose();
    this.heads.material.dispose();
  }
}
