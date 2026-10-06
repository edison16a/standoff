import * as THREE from "three";
import { softDot } from "../textures";
import { pointMaterial } from "./particles";

const color = new THREE.Color();

/**
 * Soft glows over lamps: headlamps, tail lamps that flare under braking,
 * and hot exhausts. Without a bloom pass a lit lens looks flat, so each
 * gets a halo sprite, sized in metres and hidden behind anything in front
 * of it. Refilled every frame; one draw for every lamp on the map.
 */
export class Flares {
  readonly points: THREE.Points;
  private readonly pos: Float32Array;
  private readonly col: Float32Array;
  private readonly size: Float32Array;
  private readonly alpha: Float32Array;
  private readonly facing: Float32Array;
  private readonly material: THREE.ShaderMaterial;
  private count = 0;

  constructor(private readonly max: number) {
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.facing = new Float32Array(max * 3);
    const geo = new THREE.BufferGeometry();
    const attr = (array: Float32Array, n: number) => new THREE.BufferAttribute(array, n).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", attr(this.pos, 3));
    geo.setAttribute("color", attr(this.col, 3));
    geo.setAttribute("size", attr(this.size, 1));
    geo.setAttribute("alpha", attr(this.alpha, 1));
    geo.setAttribute("facing", attr(this.facing, 3));
    this.material = pointMaterial(softDot("rgba(255,255,255,1)", "rgba(255,255,255,0)"), true, true);
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
  }

  setViewHeight(pixels: number, fovDeg: number): void {
    this.material.uniforms.scale!.value = pixels / (2 * Math.tan((fovDeg * Math.PI) / 360));
  }

  begin(): void {
    this.count = 0;
  }

  /** `facing` is the way the lamp points, a unit vector. */
  add(at: THREE.Vector3, facing: THREE.Vector3, hex: THREE.ColorRepresentation, size: number, alpha: number): void {
    if (this.count >= this.max) return;
    const i = this.count++;
    this.pos.set([at.x, at.y, at.z], i * 3);
    color.set(hex);
    this.col.set([color.r, color.g, color.b], i * 3);
    this.size[i] = size;
    this.alpha[i] = alpha;
    this.facing.set([facing.x, facing.y, facing.z], i * 3);
  }

  end(): void {
    const geo = this.points.geometry;
    geo.setDrawRange(0, this.count);
    for (const name of ["position", "color", "size", "alpha", "facing"]) geo.getAttribute(name).needsUpdate = true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.material.uniforms.map!.value.dispose();
    this.material.dispose();
  }
}
