import * as THREE from "three";
import type { Piece } from "../../engine/arena";
import type { BattleEvent, Trace } from "../../engine/events";
import type { Fighter } from "../../engine/fighter";
import { TEAMS } from "../../teams";
import type { FighterView } from "../fighter-view";
import { FIELD_COLOURS } from "../palette";
import { BodySplats } from "./body-splats";
import { Flashes } from "./flashes";
import { Paintballs } from "./paintballs";
import { Particles } from "./particles";
import { Splats } from "./splats";
import { surfaceNormal } from "./surface";

const from = new THREE.Vector3();
const to = new THREE.Vector3();
const n = new THREE.Vector3();

/** A small seeded random source, so the showcase films the same splats every time. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A ball still in the air, and what it does when it lands. */
interface Landing {
  at: number;
  trace: Trace;
  from: THREE.Vector3;
  colour: string;
  pellet: boolean;
}

/**
 * Everything a shot leaves behind: a puff of air at the barrel, the
 * paintball flying in the shooter's team colour, and where it lands a
 * pop of paint and a splat, on the bunker, the turf or the fighter it
 * struck. Driven by the battle's events, so every shot on screen is a
 * real one. The splat waits until the ball gets there.
 */
export class Effects {
  readonly group = new THREE.Group();
  readonly flashes = new Flashes();
  readonly balls = new Paintballs();
  readonly splats = new Splats();
  readonly bodies = new BodySplats(this.splats.texture);
  readonly puffs = new Particles(900, false);
  private rand = seeded(11);
  private landings: Landing[] = [];
  private views: ReadonlyMap<number, FighterView> = new Map();

  constructor(private readonly pieces: readonly Piece[]) {
    this.group.add(this.flashes.group, this.balls.mesh, this.splats.mesh, this.puffs.points);
  }

  onEvent(e: BattleEvent, fighters: readonly Fighter[], views: ReadonlyMap<number, FighterView>, now: number): void {
    this.views = views;
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
      const flight = this.balls.add(from, to, colour, now, pellet);
      this.landings.push({ at: now + flight, trace: t, from: from.clone(), colour, pellet });
    }
  }

  private land(l: Landing, now: number): void {
    const t = l.trace;
    to.set(t.to.x, t.to.y, t.to.z);
    const size = l.pellet ? 0.2 : 0.34;
    const pick = this.rand();
    const spin = this.rand();
    if (t.hit.type === "cover") {
      const piece = this.pieces[t.hit.piece];
      if (!piece) return;
      const nv = surfaceNormal(piece, t.to);
      n.set(nv.x, nv.y, nv.z);
      this.splats.add(to, n, l.colour, size * (0.8 + 0.5 * spin), pick, spin, now);
      this.pop(to, n, l.colour, l.pellet ? 5 : 11);
    } else if (t.hit.type === "floor") {
      n.set(0, 1, 0);
      this.splats.add(to, n, l.colour, size, pick, spin, now);
      this.pop(to, n, l.colour, l.pellet ? 4 : 8);
      this.puffs.burst({ at: to, count: 3, colour: FIELD_COLOURS.turf, speed: [0.8, 2], dir: n, push: 1.5, spread: 0.5, life: [0.3, 0.5], size: [0.04, 0.07] }, this.rand);
    } else if (t.hit.type === "fighter") {
      const meshes = this.views.get(t.hit.id)?.model.meshes;
      if (meshes) this.bodies.add(t.hit.id, meshes, l.from, to, l.colour, (l.pellet ? 0.07 : 0.11) * (0.85 + 0.3 * spin), pick, spin);
      this.pop(to, n.copy(l.from).sub(to).normalize(), l.colour, t.hit.head ? 16 : 10);
    }
  }

  /** The ball bursting: a spray of paint flung back off the surface. */
  private pop(at: THREE.Vector3, normal: THREE.Vector3, colour: string, count: number): void {
    this.puffs.burst({ at, count, colour, speed: [1, 3.4], dir: normal, push: 1.4, spread: 0.65, life: [0.25, 0.55], size: [0.03, 0.08], gravity: 8 }, this.rand);
  }

  /** A fighter going down throws up a big burst of the winner's paint. */
  private kill(victim: number, killer: number, fighters: readonly Fighter[], views: ReadonlyMap<number, FighterView>): void {
    const v = views.get(victim);
    const k = fighters[killer];
    if (!v || !k) return;
    v.head(to);
    this.puffs.burst({ at: to, count: 30, colour: TEAMS[k.team].color, speed: [1.5, 4], life: [0.5, 1], size: [0.07, 0.15], gravity: 8 }, this.rand);
  }

  /** Point sizes and ball sizes follow the view they are drawn in. */
  setView(camera: THREE.PerspectiveCamera, heightPx: number): void {
    this.puffs.setView(heightPx, camera.fov);
    this.balls.setView(camera.position, camera.fov, heightPx);
  }

  update(now: number, dt: number): void {
    this.bodies.frame();
    if (this.landings.length > 0) {
      const due = this.landings.filter((l) => l.at <= now);
      this.landings = this.landings.filter((l) => l.at > now);
      for (const l of due) this.land(l, now);
    }
    this.flashes.update(now);
    this.balls.update(now);
    this.splats.update(now);
    this.puffs.update(dt);
  }

  /** A fresh field for a new round. */
  clear(): void {
    this.landings = [];
    this.splats.clear();
    this.bodies.clear();
    this.balls.clear();
    this.puffs.clear();
    this.flashes.clear();
  }

  dispose(): void {
    this.flashes.dispose();
    this.balls.dispose();
    this.bodies.dispose();
    this.splats.dispose();
    this.puffs.dispose();
  }
}
