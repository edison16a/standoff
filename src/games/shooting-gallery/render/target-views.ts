import * as THREE from "three";
import { isDuck, KINDS, type TargetKind } from "../engine/kinds";
import { FALL_S, POP_TIME_S } from "../engine/rules";
import type { Target } from "../engine/target";
import { createDuck } from "./models/duck";
import { createBullseye, createPlate } from "./models/targets";
import { glowTexture } from "./textures";

/** The BB takes this long to reach a target, so things start to fall when it lands, not when the trigger is pulled. */
export const FLIGHT_S = 0.06;

/** One drawn target: a hinge that tips, holding a model that faces its way. */
interface View {
  root: THREE.Group;
  hinge: THREE.Group;
  model: THREE.Group;
  kind: TargetKind;
  /** The twinkle on a golden duck. */
  glint: THREE.Sprite | null;
}

let glint: THREE.Texture | null = null;

/** A star of light that twinkles on the golden duck's head, so it catches the eye. */
function makeGlint(): THREE.Sprite {
  glint ??= glowTexture();
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glint, color: "#fff2b0", blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  sprite.position.set(0.12, 0.62, 0.12);
  return sprite;
}

/** Tipping over with a little bounce as it hits the stop, like a real knockdown. */
function fallCurve(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  if (t < 0.72) {
    const u = t / 0.72;
    return u * u;
  }
  const u = (t - 0.72) / 0.28;
  return 1 - 0.12 * Math.sin(u * Math.PI);
}

/** A sharp shove on impact before the fall, so the hit reads even at a glance. */
function jolt(t: number): number {
  return t > 0 && t < 0.12 ? Math.sin((t / 0.12) * Math.PI) : 0;
}

/**
 * Keeps a model in the scene for every target the engine has, reusing
 * models from a pool per kind as targets come and go.
 */
export class TargetViews {
  readonly object = new THREE.Group();
  private readonly live = new Map<number, View>();
  private readonly pool = new Map<TargetKind, View[]>();

  update(targets: readonly Target[], time: number): void {
    const seen = new Set<number>();
    for (const target of targets) {
      seen.add(target.id);
      let view = this.live.get(target.id);
      if (!view) {
        view = this.take(target.kind);
        this.live.set(target.id, view);
      }
      this.place(view, target, time);
    }
    for (const [id, view] of this.live) {
      if (seen.has(id)) continue;
      view.root.visible = false;
      this.live.delete(id);
      this.pool.get(view.kind)!.push(view);
    }
  }

  private place(view: View, target: Target, time: number): void {
    const { root, hinge, model } = view;
    root.position.set(target.x, target.y, target.z);
    model.rotation.y = isDuck(target.kind) && target.facing < 0 ? Math.PI : 0;
    // Ducks rock as they ride the waves.
    model.rotation.z = isDuck(target.kind) ? 0.07 * Math.sin(time * 2.4 + target.id * 1.7 + 1.2) : 0;
    const since = target.hit ? time - target.hit.at - FLIGHT_S : -1;
    const fall = fallCurve(since / FALL_S);
    const kick = jolt(since);
    if (target.kind === "plate") {
      // Plates hang below their trolley, so a hit swings them up and over backwards.
      hinge.rotation.x = fall * 1.9 + kick * 0.3;
    } else {
      hinge.rotation.x = -fall * (Math.PI / 2) * 0.96 - kick * 0.15 + this.wobble(target, time);
    }
    if (view.glint) {
      view.glint.visible = !target.hit;
      view.glint.scale.setScalar(0.12 + 0.2 * Math.max(0, Math.sin(time * 5 + target.id)));
    }
    // Once flat, ducks and bullseyes drop away out of sight behind their wave, as the real ones do.
    if (target.kind !== "plate" && since > FALL_S) root.position.y -= Math.min(0.6, (since - FALL_S) * 1.8);
    root.visible = true;
  }

  /** A bullseye springs a little on its stick as it snaps up. */
  private wobble(target: Target, time: number): number {
    if (target.kind !== "bullseye" || target.hit) return 0;
    const t = time - target.born - POP_TIME_S;
    return t > 0 && t < 0.8 ? 0.14 * Math.sin(t * 22) * Math.exp(-t * 6) : 0;
  }

  private take(kind: TargetKind): View {
    const spare = this.pool.get(kind)?.pop();
    if (spare) {
      spare.hinge.rotation.set(0, 0, 0);
      return spare;
    }
    if (!this.pool.has(kind)) this.pool.set(kind, []);
    const model = isDuck(kind) ? createDuck(kind) : kind === "bullseye" ? createBullseye() : createPlate();
    model.scale.setScalar(KINDS[kind].scale);
    const hinge = new THREE.Group();
    hinge.add(model);
    const sparkle = kind === "golden" ? makeGlint() : null;
    if (sparkle) model.add(sparkle);
    const root = new THREE.Group();
    root.add(hinge);
    this.object.add(root);
    return { root, hinge, model, kind, glint: sparkle };
  }
}
