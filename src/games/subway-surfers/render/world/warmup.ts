import * as THREE from "three";
import { POWER_KINDS } from "../../engine/types";
import { highBarrier, lowBarrier, ramp } from "../models/barriers";
import { pickupModel } from "../models/pickups";
import { sidePiece } from "../models/sides";
import { gantry, signalPost, trackTile } from "../models/track";
import { trainModel } from "../models/train";
import { portal, tunnel } from "../models/tunnel";
import { release } from "../prefabs";
import { THEMES } from "./themes";

type Make = () => THREE.Object3D;

/** Every piece the yard can show, soonest needed first: the first zone, the trains and barriers, then the later zones. */
export function warmList(): Make[] {
  const list: Make[] = [];
  const zone = (index: number) => {
    const theme = THEMES[index]!;
    list.push(() => trackTile(theme));
    for (const [kind] of theme.sides) for (const side of [-1, 1] as const) for (let v = 0; v < 4; v++) list.push(() => sidePiece(kind, side, v, theme, index));
  };
  zone(0);
  for (let livery = 0; livery < 4; livery++) for (const lit of [false, true]) list.push(() => trainModel(livery, 2, lit, 0));
  list.push(() => lowBarrier(0), () => lowBarrier(1), () => highBarrier(0), () => highBarrier(1), () => ramp(), () => tunnel(), () => portal(), () => gantry(0));
  for (const kind of POWER_KINDS) list.push(() => pickupModel(kind));
  for (let lit = 0; lit < 3; lit++) for (const side of [-1, 1] as const) list.push(() => signalPost(side, lit));
  for (let index = 1; index < THEMES.length; index++) zone(index);
  return list;
}

/**
 * Builds the yard's pieces ahead of time, one a frame, while the menus
 * are up: paints their textures, merges their geometry, compiles their
 * shaders and uploads their textures, then hands them to the pool. A new
 * zone, a new train or a first tunnel then never stalls a frame mid run.
 */
export class Warmup {
  private readonly queue = warmList();
  private readonly fresh: THREE.Object3D[] = [];

  get done(): boolean {
    return this.queue.length === 0 && this.fresh.length === 0;
  }

  /** Builds the next piece. Called once a frame. */
  step(): void {
    const make = this.queue.shift();
    if (make) this.fresh.push(make());
  }

  /** Gets the new pieces ready on the graphics card, then pools them. Called with the renderer, before drawing. */
  flush(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void {
    if (this.fresh.length === 0) return;
    const holder = new THREE.Group();
    for (const piece of this.fresh) holder.add(piece);
    gl.compile(holder, camera, scene);
    holder.traverse((node) => {
      const material = (node as THREE.Mesh).material as THREE.MeshToonMaterial | undefined;
      if (material?.map) gl.initTexture(material.map);
    });
    for (const piece of [...holder.children]) release(piece);
    this.fresh.length = 0;
  }
}
