import { Quaternion, Vector3, type Mesh, type MeshStandardMaterial, type Object3D, type Scene } from "three";
import type { Body } from "../engine/events";
import { KINDS, type BodyKind } from "../engine/fruit-kinds";
import type { ModelLibrary } from "./models/library";
import { RareHalo } from "./rare-halo";

export interface FruitView {
  id: number;
  kind: BodyKind;
  obj: Object3D;
  spin: Vector3;
  /** Model units to world units. */
  scale: number;
  crack: MeshStandardMaterial | null;
  /** Seconds left of the wobble after a hit. */
  pulse: number;
  halo: RareHalo | null;
  sparks: Object3D[];
}

const turn = new Quaternion();
const axis = new Vector3();
const RARE_HALO: Partial<Record<BodyKind, string>> = { "star-fruit": "#ffc830", dragonfruit: "#ff4fd0" };

/**
 * The fruit and bombs in flight, kept in step with the engine's bodies.
 * The engine moves them in 2D; here they also tumble in 3D, big fruit
 * wobble and crack when hit, rare fruit glow and bomb fuses fizz.
 */
export class FruitViews {
  private readonly views = new Map<number, FruitView>();

  constructor(
    private readonly scene: Scene,
    private readonly library: ModelLibrary,
  ) {}

  get all(): Iterable<FruitView> {
    return this.views.values();
  }

  sync(bodies: readonly Body[], dt: number, time: number): void {
    const seen = new Set<number>();
    for (const body of bodies) {
      seen.add(body.id);
      const view = this.views.get(body.id) ?? this.create(body);
      view.obj.position.set(body.x, body.y, 0);
      axis.set(body.spin.x, body.spin.y, body.spin.z);
      const rate = axis.length();
      if (rate > 0) view.obj.quaternion.multiply(turn.setFromAxisAngle(axis.normalize(), rate * dt));
      if (view.pulse > 0) {
        view.pulse = Math.max(0, view.pulse - dt);
        const wobble = 1 + Math.sin(view.pulse * 40) * view.pulse * 0.6;
        view.obj.scale.set(view.scale * wobble, view.scale / wobble, view.scale * wobble);
      }
      if (view.crack) view.crack.opacity = Math.min(1, (1 - body.hitsLeft / body.hits) * 1.3);
      view.halo?.update(time, body.id);
      for (const spark of view.sparks) spark.scale.setScalar((spark.name === "spark" ? 0.9 : 0.3) * (0.7 + Math.random() * 0.6));
    }
    for (const [id, view] of this.views) {
      if (!seen.has(id)) this.remove(view);
    }
  }

  /** Takes a fruit out of the scene at the moment it is cut, so its halves can replace it. */
  take(id: number): FruitView | null {
    const view = this.views.get(id);
    if (!view) return null;
    this.remove(view);
    return view;
  }

  /** Starts the wobble of a big fruit that was hit but not finished. */
  hit(id: number): void {
    const view = this.views.get(id);
    if (view) view.pulse = 0.35;
  }

  clear(): void {
    for (const view of [...this.views.values()]) this.remove(view);
  }

  private create(body: Body): FruitView {
    const template = this.library.get(body.kind);
    const obj = this.library.whole(body.kind);
    obj.scale.setScalar(template.scale);
    // Start at a random turn so two of a kind never look identical.
    obj.quaternion.setFromAxisAngle(axis.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), Math.random() * Math.PI * 2);
    let crack: MeshStandardMaterial | null = null;
    const sparks: Object3D[] = [];
    obj.traverse((child) => {
      if (child.name === "crack") {
        const mesh = child as Mesh;
        crack = (mesh.material as MeshStandardMaterial).clone();
        mesh.material = crack;
      }
      if (child.name === "spark" || child.name === "spark-core") sparks.push(child);
    });
    const haloColor = RARE_HALO[body.kind];
    const halo = haloColor ? new RareHalo(haloColor, body.kind === "dragonfruit") : null;
    if (halo) obj.add(halo.group);
    this.scene.add(obj);
    const view: FruitView = { id: body.id, kind: body.kind, obj, spin: new Vector3(), scale: template.scale, crack, pulse: 0, halo, sparks };
    this.views.set(body.id, view);
    return view;
  }

  private remove(view: FruitView): void {
    this.scene.remove(view.obj);
    view.crack?.dispose();
    view.halo?.dispose();
    this.views.delete(view.id);
  }
}

/** Whether a kind glows and pays well. */
export function isRare(kind: BodyKind): boolean {
  return KINDS[kind].class === "rare";
}
