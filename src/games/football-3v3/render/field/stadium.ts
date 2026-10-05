import * as THREE from "three";
import { FIELD } from "../../engine/field";
import { TEAMS } from "../../teams";
import { box, cyl, merge, paint } from "../models/geo";
import { BOWL, seat, standsGeometry } from "./bowl";
import { Crowd } from "./crowd";
import { fieldTexture, PAINT_H, PAINT_W } from "./field-texture";
import type { GoalHitView } from "../../engine/view";
import { GoalPosts } from "./goal-posts";
import { KickNets } from "./kick-net";

/**
 * The whole venue: the painted field, the grass round it, both goal
 * posts, the team benches, the bowl of stands with its crowd, four
 * light towers and the night sky. Everything that never moves, plus the
 * crowd's excitement.
 */
export class Stadium {
  readonly group = new THREE.Group();
  readonly crowd: Crowd | null;
  private readonly posts: GoalPosts;
  private readonly nets: KickNets;
  private readonly disposables: { dispose(): void }[] = [];

  constructor(low: boolean, maxAnisotropy: number) {
    const shared = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.1 });
    this.keep(shared);
    // The ground round the field: darker grass out to the stands.
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(BOWL.a * 2 + 10, BOWL.b * 2 + 10), new THREE.MeshStandardMaterial({ color: "#23592a", roughness: 0.95 }));
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = -0.01;
    apron.receiveShadow = true;
    this.add(apron);
    const map = fieldTexture(low ? 14 : 34, maxAnisotropy);
    this.keep(map);
    const field = new THREE.Mesh(new THREE.PlaneGeometry(PAINT_W, PAINT_H), new THREE.MeshStandardMaterial({ map, roughness: 0.92 }));
    field.rotation.x = -Math.PI / 2;
    field.receiveShadow = true;
    this.add(field);
    this.posts = new GoalPosts(shared);
    this.nets = new KickNets(shared);
    this.group.add(this.posts.group, this.nets.group);
    this.add(new THREE.Mesh(benches(), shared));
    const stands = new THREE.Mesh(standsGeometry(BOWL, low ? 64 : 160), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }));
    stands.receiveShadow = !low;
    this.add(stands);
    this.add(new THREE.Mesh(rim(), shared));
    this.add(new THREE.Mesh(towers(), shared));
    this.add(lamps());
    this.add(sky());
    this.crowd = low ? null : new Crowd();
    if (this.crowd) this.add(this.crowd.mesh);
  }

  private add(o: THREE.Object3D): void {
    this.group.add(o);
  }

  /** Textures and shared materials that no single mesh owns. */
  private keep(d: { dispose(): void }): void {
    this.disposables.push(d);
  }

  /** `goal` is what the ball last hit at either end, for the posts to shake and the nets to bulge. */
  update(time: number, dt: number, goal: GoalHitView | null = null): void {
    this.crowd?.update(time, dt);
    this.posts.update(goal);
    this.nets.update(goal);
  }

  dispose(): void {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) m.dispose();
      }
    });
    for (const d of this.disposables) d.dispose();
    this.nets.dispose();
    this.crowd?.dispose();
  }
}

/** Two long benches behind each sideline, with a team coloured backdrop. */
function benches(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const z = FIELD.halfWidth + 9;
  for (const team of [0, 1] as const) {
    const side = team === 0 ? 1 : -1;
    parts.push(paint(box(30, 0.45, 0.6), "#2b2f3a", { at: [0, 0.45, side * z] }));
    parts.push(paint(box(30, 1.2, 0.12), TEAMS[team].color, { at: [0, 0.9, side * (z + 0.45)] }));
    parts.push(paint(box(34, 0.06, 4), "#3a3f4b", { at: [0, 0.03, side * (z - 0.6)] }));
  }
  return merge(parts);
}

/** The dark lip along the top of the stands. */
function rim(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const steps = 160;
  for (let i = 0; i < steps; i++) {
    // Each panel spans from one step to the next along the top row, overlapping a little so there are no gaps.
    const a = seat(BOWL, (i / steps) * Math.PI * 2, BOWL.rows);
    const b = seat(BOWL, ((i + 1) / steps) * Math.PI * 2, BOWL.rows);
    const len = Math.hypot(b.x - a.x, b.z - a.z) + 0.6;
    const yaw = Math.atan2(b.x - a.x, b.z - a.z) - Math.PI / 2;
    parts.push(paint(box(len, 3, 1.2), "#0b1120", { at: [(a.x + b.x) / 2, a.y + 1.5, (a.z + b.z) / 2], rot: [0, yaw, 0] }));
  }
  return merge(parts);
}

const TOWER_SPOTS = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const;

function towerTop(sx: number, sz: number): THREE.Vector3 {
  return new THREE.Vector3(sx * (BOWL.a + 14), 48, sz * (BOWL.b + 12));
}

/** Four light towers standing outside the corners of the bowl. */
function towers(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const [sx, sz] of TOWER_SPOTS) {
    const top = towerTop(sx, sz);
    parts.push(paint(cyl(0.8, 1.2, top.y, 10), "#4a5160", { at: [top.x, top.y / 2, top.z] }));
    parts.push(paint(box(9, 5, 1), "#2a2f3a", { at: [top.x, top.y + 2, top.z], rot: [0, Math.atan2(-top.x, -top.z), 0] }));
  }
  return merge(parts);
}

/** The lamp panels glow on their own, whatever the lighting. */
function lamps(): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: "#fffbe8" });
  for (const [sx, sz] of TOWER_SPOTS) {
    const top = towerTop(sx, sz);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 4.2), mat);
    panel.position.set(top.x - sx * 0.6, top.y + 2, top.z - sz * 0.6);
    panel.lookAt(0, 0, 0);
    group.add(panel);
  }
  return group;
}

/** A dome of night sky, deep blue overhead fading to a warm city glow at the horizon. */
function sky(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(400, 32, 16);
  const colours: number[] = [];
  const pos = geo.getAttribute("position");
  const top = new THREE.Color("#050a1c");
  const mid = new THREE.Color("#14224a");
  const low = new THREE.Color("#4a3a5a");
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const h = pos.getY(i) / 400;
    if (h > 0.25) c.copy(mid).lerp(top, Math.min(1, (h - 0.25) / 0.6));
    else c.copy(low).lerp(mid, Math.max(0, h / 0.25));
    colours.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colours, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  mesh.renderOrder = -1;
  return mesh;
}
