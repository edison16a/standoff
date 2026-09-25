import * as THREE from "three";
import type { Slot } from "@/games/blade-clash/players";
import { disposeOwned, MeshBuilder } from "../kit/mesh-builder";
import { cloth, glow, metal, own, plastic } from "../kit/materials";
import { glowTexture } from "../kit/textures";
import { PLAYER_COLOURS } from "../player-colours";

interface Lamp {
  material: THREE.MeshStandardMaterial;
  halo: THREE.Sprite;
  level: number;
}

/**
 * The scoring machine on its table behind the strip, with a big red lamp
 * for player one and a green one for player two, a score screen, and a tall
 * repeater lamp at each end of the strip. A touch lights the scorer's lamps
 * and they glow on through the slow motion, as on a real strip.
 */
export class Scoring {
  readonly group = new THREE.Group();
  private readonly lamps: Record<Slot, Lamp[]> = { 1: [], 2: [] };
  private readonly screen: HTMLCanvasElement;
  private readonly screenTexture: THREE.CanvasTexture;
  private shown = "";

  constructor(stripEnd: number) {
    const b = new MeshBuilder();
    const wood = cloth(0x5a3a22, 0.55);
    const dark = plastic(0x1c1f26, 0.4);
    // The table.
    b.box(1.3, 0.05, 0.62, wood, [0, 0.745, 0], [0, 0, 0], 0.01);
    for (const x of [-0.6, 0.6]) for (const z of [-0.26, 0.26]) b.cylinder(0.022, 0.018, 0.72, metal(0x2a2d33, 0.4), [x, 0.36, z]);
    b.box(1.26, 0.28, 0.02, cloth(0x24264a, 0.8), [0, 0.58, 0.29]);
    // The machine: a dark case with the lamp domes on top.
    b.box(0.66, 0.24, 0.32, dark, [0, 0.89, 0], [0, 0, 0], 0.03);
    b.box(0.5, 0.012, 0.2, metal(0x5b6270, 0.4), [0, 1.016, 0], [0, 0, 0], 0.004);
    for (const x of [-0.25, 0.25]) b.cylinder(0.075, 0.08, 0.03, metal(0x3a3f48, 0.35), [x, 1.02, 0], [0, 0, 0], 24);
    for (const x of [-0.1, 0.1]) b.cylinder(0.035, 0.038, 0.02, metal(0x3a3f48, 0.35), [x, 1.02, 0]);
    // Repeater poles at each end of the strip.
    for (const side of [-1, 1]) {
      b.cylinder(0.035, 0.05, 1.9, metal(0x2a2d33, 0.35), [side * stripEnd, 0.95, -1.55]);
      b.cylinder(0.2, 0.22, 0.04, metal(0x2a2d33, 0.35), [side * stripEnd, 0.02, -1.55], [0, 0, 0], 20);
      b.box(0.34, 0.2, 0.2, dark, [side * stripEnd, 1.98, -1.55], [0, 0, 0], 0.03);
    }
    this.group.add(b.build("scoring"));

    this.screen = document.createElement("canvas");
    this.screen.width = 512;
    this.screen.height = 192;
    this.screenTexture = new THREE.CanvasTexture(this.screen);
    this.screenTexture.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.18), new THREE.MeshBasicMaterial({ map: this.screenTexture, toneMapped: false }));
    face.position.set(0, 0.885, 0.162);
    this.group.add(face);
    this.setScores(0, 0);

    for (const slot of [1, 2] as const) {
      const x = slot === 1 ? -0.25 : 0.25;
      this.lamps[slot].push(this.lamp(slot, new THREE.Vector3(x, 1.05, 0), 0.07));
      this.lamps[slot].push(this.lamp(slot, new THREE.Vector3((slot === 1 ? -1 : 1) * stripEnd, 2.0, -1.44), 0.12));
    }
    // The white off target lamps, never lit here since off target is just a miss.
    for (const x of [-0.1, 0.1]) {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), glow(0xf2f2f2, 0.15));
      dome.position.set(x, 1.03, 0);
      this.group.add(dome);
    }
  }

  setScores(left: number, right: number): void {
    const text = `${left}:${right}`;
    if (text === this.shown) return;
    this.shown = text;
    const ctx = this.screen.getContext("2d");
    if (!ctx) return;
    const { width: w, height: h } = this.screen;
    ctx.fillStyle = "#07080c";
    ctx.fillRect(0, 0, w, h);
    ctx.font = `700 ${h * 0.72}px "Courier New", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ff4757";
    ctx.fillText(String(left), w * 0.22, h * 0.54);
    ctx.fillStyle = "#2ed573";
    ctx.fillText(String(right), w * 0.78, h * 0.54);
    ctx.fillStyle = "#ffd23f";
    ctx.font = `700 ${h * 0.36}px "Courier New", monospace`;
    ctx.fillText("3:00", w * 0.5, h * 0.54);
    this.screenTexture.needsUpdate = true;
  }

  /** A touch: the scorer's lamps come on. */
  light(slot: Slot): void {
    for (const lamp of this.lamps[slot]) lamp.level = 1;
  }

  /** The lamps stay lit through the slow motion, then fade. */
  update(dtMs: number): void {
    for (const slot of [1, 2] as const) {
      for (const lamp of this.lamps[slot]) {
        lamp.level *= Math.exp(-dtMs / 1600);
        const on = lamp.level;
        lamp.material.emissiveIntensity = 0.25 + on * 6;
        lamp.halo.material.opacity = on * 0.9;
      }
    }
  }

  dispose(): void {
    disposeOwned(this.group);
    this.screenTexture.dispose();
  }

  private lamp(slot: Slot, at: THREE.Vector3, radius: number): Lamp {
    const colour = PLAYER_COLOURS[slot];
    const material = own(glow(colour, 0.25), { color: new THREE.Color(colour).multiplyScalar(0.25) });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), material);
    dome.position.copy(at);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: colour, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    halo.scale.setScalar(radius * 9);
    halo.position.copy(at).add(new THREE.Vector3(0, radius * 0.4, 0.02));
    // A glow rather than a real light: lights cost every pixel of the hall, a sprite costs its own.
    this.group.add(dome, halo);
    return { material, halo, level: 0 };
  }
}
