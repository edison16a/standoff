import * as THREE from "three";
import type { Piece } from "../../engine/arena";
import type { BattleEvent, Trace } from "../../engine/events";
import type { Fighter } from "../../engine/fighter";
import { TEAMS } from "../../teams";
import type { FighterView } from "../fighter-view";
import { FIELD_COLOURS } from "../palette";
import { Flashes } from "./flashes";
import { Particles } from "./particles";
import { Splats } from "./splats";
import { surfaceNormal } from "./surface";
import { Tracers } from "./tracers";

const from = new THREE.Vector3();
const to = new THREE.Vector3();
const n = new THREE.Vector3();
const d = new THREE.Vector3();

/** A small seeded random source, so the showcase films the same sparks every time. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Everything a shot leaves behind: the muzzle flash, the tracer, a spent
 * case flying out, and where it lands a burst of paint in the shooter's
 * colour, a splat on the bunker or the turf, or a splash off a fighter.
 * Driven by the battle's events, so every shot on screen is a real one.
 */
export class Effects {
  readonly group = new THREE.Group();
  readonly flashes = new Flashes();
  readonly tracers = new Tracers();
  readonly splats = new Splats();
  readonly puffs = new Particles(900, false);
  readonly glow = new Particles(300, true);
  private rand = seeded(11);

  constructor(private readonly pieces: readonly Piece[]) {
    this.group.add(this.flashes.group, this.tracers.mesh, this.splats.mesh, this.puffs.points, this.glow.points);
  }

  onEvent(e: BattleEvent, fighters: readonly Fighter[], views: ReadonlyMap<number, FighterView>, now: number): void {
    if (e.type === "shot") this.shot(e, fighters, views, now);
    else if (e.type === "kill") this.kill(e.victim, e.killer, fighters, views);
  }

  private shot(e: Extract<BattleEvent, { type: "shot" }>, fighters: readonly Fighter[], views: ReadonlyMap<number, FighterView>, now: number): void {
    const view = views.get(e.shooter);
    const shooter = fighters[e.shooter];
    if (!view || !shooter) return;
    const colour = TEAMS[shooter.team].color;
    view.gun.root.updateWorldMatrix(true, true);
    view.muzzle(from);
    this.flashes.fire(e.shooter, view.gun.muzzle, e.gun, now, this.rand());
    const pellet = e.traces.length > 1;
    for (const t of e.traces) {
      to.set(t.to.x, t.to.y, t.to.z);
      this.tracers.add(from, to, now, pellet);
      this.impact(t, colour, pellet);
    }
    // A spent case out of the right side, up and back; the shotgun's comes with the pump.
    d.set(-1, 0.6, -0.3).applyQuaternion(view.gun.root.getWorldQuaternion(new THREE.Quaternion()));
    const brass = e.gun === "shotgun" ? "#b3261e" : "#d9a441";
    this.puffs.burst({ at: from.clone().lerp(view.gun.root.getWorldPosition(new THREE.Vector3()), 0.85), count: 1, colour: brass, speed: [0.3, 0.6], dir: d, push: 2.4, spread: 0.2, life: [0.5, 0.7], size: [0.035, 0.04], gravity: 9.8, drag: 0.6 }, this.rand);
  }

  private impact(t: Trace, colour: string, pellet: boolean): void {
    const size = pellet ? 0.14 : 0.24;
    const spin = this.rand();
    if (t.hit.type === "cover") {
      const piece = this.pieces[t.hit.piece];
      if (!piece) return;
      const nv = surfaceNormal(piece, t.to);
      n.set(nv.x, nv.y, nv.z);
      this.splats.add(to, n, colour, size * (0.8 + 0.5 * spin), spin);
      this.puffs.burst({ at: to, count: pellet ? 2 : 5, colour, speed: [0.8, 2.4], dir: n, push: 1.2, spread: 0.7, life: [0.25, 0.5], size: [0.05, 0.1], gravity: 6 }, this.rand);
    } else if (t.hit.type === "floor") {
      n.set(0, 1, 0);
      this.splats.add(to, n, colour, size, spin);
      this.puffs.burst({ at: to, count: 4, colour: FIELD_COLOURS.turf, speed: [0.8, 2], dir: n, push: 1.5, spread: 0.5, life: [0.3, 0.5], size: [0.04, 0.07] }, this.rand);
    } else if (t.hit.type === "fighter") {
      this.puffs.burst({ at: to, count: t.hit.head ? 14 : 8, colour, speed: [1, 3.2], life: [0.3, 0.6], size: [0.06, 0.12], gravity: 7 }, this.rand);
      this.glow.burst({ at: to, count: t.hit.head ? 6 : 3, colour: "#ffffff", speed: [0.5, 1.5], life: [0.1, 0.2], size: [0.08, 0.14], gravity: 0 }, this.rand);
    }
  }

  /** A fighter going down throws up a big burst of the winner's paint. */
  private kill(victim: number, killer: number, fighters: readonly Fighter[], views: ReadonlyMap<number, FighterView>): void {
    const v = views.get(victim);
    const k = fighters[killer];
    if (!v || !k) return;
    v.head(to);
    this.puffs.burst({ at: to, count: 30, colour: TEAMS[k.team].color, speed: [1.5, 4], life: [0.5, 1], size: [0.07, 0.15], gravity: 8 }, this.rand);
  }

  /** Point sizes and tracer widths follow the view they are drawn in. */
  setView(camera: THREE.PerspectiveCamera, heightPx: number): void {
    this.puffs.setView(heightPx, camera.fov);
    this.glow.setView(heightPx, camera.fov);
    this.tracers.setView(camera.position, camera.fov, heightPx);
  }

  update(now: number, dt: number): void {
    this.flashes.update(now);
    this.tracers.update(now);
    this.puffs.update(dt);
    this.glow.update(dt);
  }

  /** A fresh field for a new round. */
  clear(): void {
    this.splats.clear();
    this.tracers.clear();
    this.puffs.clear();
    this.glow.clear();
    this.flashes.clear();
  }

  dispose(): void {
    this.flashes.dispose();
    this.tracers.dispose();
    this.splats.dispose();
    this.puffs.dispose();
    this.glow.dispose();
  }
}
