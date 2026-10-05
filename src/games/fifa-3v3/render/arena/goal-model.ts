import * as THREE from "three";
import type { NetDent, NetsView } from "../../engine/net-view";
import { panelFrame, panelPoint, PANELS, type PanelId } from "../../engine/physics/net-panels";
import { PITCH } from "../../engine/tuning";
import { merge, paint, rod } from "../models/geo";

const GW = PITCH.goalHalfWidth;
const GH = PITCH.goalHeight;
const GD = PITCH.goalDepth;
const HL = PITCH.halfLength;
const CELL = 0.12;
const IDS: readonly PanelId[] = ["back", "left", "right", "roof"];
/** Grid steps across each sheet: fine enough for a round dent where the ball pressed. */
const STEPS: Record<PanelId, [number, number]> = { back: [36, 16], left: [10, 16], right: [10, 16], roof: [10, 36] };

/** How the frame rings when the ball hits it: metres of shake per m/s, the most, how fast and how long. */
const RING = { perSpeed: 0.0009, max: 0.025, hz: 17, decay: 0.35 } as const;

/**
 * One goal: round white posts and bar, a slim frame behind holding the
 * net, and the net, drawn from the simulation's own sheets (engine/
 * physics/net.ts) so it bulges exactly where and as far as the ball
 * pushed it, and hangs a little slack at rest. A shot off the woodwork
 * sets the frame ringing. `end` is -1 for the left goal and 1 for the right.
 */
export class GoalModel {
  readonly group = new THREE.Group();
  private readonly sheets: { id: PanelId; mesh: THREE.Mesh; rest: Float32Array }[] = [];
  private ringAmp = 0;
  private ringT = 0;
  private readonly disposables: { dispose(): void }[] = [];

  constructor(private readonly end: -1 | 1, netMap: THREE.Texture) {
    const x = end * HL;
    const bx = end * (HL + GD);
    const white = "#f7f7f2";
    const frame = merge([
      rod([x, 0, -GW], [x, GH, -GW], PITCH.postRadius, white, 16),
      rod([x, 0, GW], [x, GH, GW], PITCH.postRadius, white, 16),
      rod([x, GH, -GW - PITCH.postRadius], [x, GH, GW + PITCH.postRadius], PITCH.postRadius, white, 16),
      rod([x, GH, -GW], [bx, GH, -GW], 0.025, "#d9d9d4"),
      rod([x, GH, GW], [bx, GH, GW], 0.025, "#d9d9d4"),
      rod([bx, GH, -GW], [bx, GH, GW], 0.025, "#d9d9d4"),
      rod([bx, 0, -GW], [bx, GH, -GW], 0.025, "#d9d9d4"),
      rod([bx, 0, GW], [bx, GH, GW], 0.025, "#d9d9d4"),
      rod([x, 0.02, -GW], [bx, 0.02, -GW], 0.03, "#bdbdb8"),
      rod([x, 0.02, GW], [bx, 0.02, GW], 0.03, "#bdbdb8"),
      rod([bx, 0.02, -GW], [bx, 0.02, GW], 0.03, "#bdbdb8"),
      paint(new THREE.SphereGeometry(PITCH.postRadius, 12, 8), white, { at: [x, GH, -GW] }),
      paint(new THREE.SphereGeometry(PITCH.postRadius, 12, 8), white, { at: [x, GH, GW] }),
    ]);
    const frameMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.35 });
    const frameMesh = new THREE.Mesh(frame, frameMat);
    frameMesh.castShadow = true;
    this.group.add(frameMesh);
    const net = new THREE.MeshStandardMaterial({ map: netMap, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.8, color: "#f2f2f2" });
    for (const id of IDS) {
      const { w, h } = PANELS[id];
      const [sw, sh] = STEPS[id];
      const g = new THREE.PlaneGeometry(w, h, sw, sh);
      const uv = g.getAttribute("uv") as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / CELL, (uv.getY(i) * h) / CELL);
      // Lit as the flat sheet it is at rest, facing out of the goal.
      const n = panelFrame(id, end, { x: 0, y: 0, z: 0 }).normal;
      const normals = g.getAttribute("normal") as THREE.BufferAttribute;
      for (let i = 0; i < normals.count; i++) normals.setXYZ(i, n.x, n.y, n.z);
      const mesh = new THREE.Mesh(g, net);
      mesh.castShadow = id === "back" || id === "roof";
      // The sheet's own plane coordinates become (u, v) on it; the vertices are placed in the world each frame.
      const rest = (g.getAttribute("position").array as Float32Array).slice();
      this.sheets.push({ id, mesh, rest });
      this.group.add(mesh);
      this.disposables.push(g);
    }
    this.disposables.push(frame, frameMat, net);
    this.shape({ back: still(), left: still(), right: still(), roof: still() });
  }

  /** Each frame: the sheets bent to the simulation's dents, and the frame's ring dying away. */
  update(net: NetsView[number], dt: number): void {
    this.shape(net);
    this.ringT += dt;
    const shake = this.ringAmp * Math.exp(-this.ringT / RING.decay) * Math.sin(2 * Math.PI * RING.hz * this.ringT);
    this.group.position.set(shake * this.end, 0, shake * 0.4);
  }

  /** The ball hit a post or the bar at `speed`. */
  ring(speed: number): void {
    this.ringAmp = Math.min(RING.max, speed * RING.perSpeed);
    this.ringT = 0;
  }

  private shape(net: NetsView[number]): void {
    for (const { id, mesh, rest } of this.sheets) {
      const { w, h } = PANELS[id];
      const dent = net[id];
      const pos = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < pos.count; i++) {
        const u = rest[i * 3]! + w / 2;
        const v = rest[i * 3 + 1]! + h / 2;
        const p = panelPoint(id, this.end, u, v, dent.depth * tent(u, dent.u, w) * tent(v, dent.v, h) + sag(id, u, v));
        arr[i * 3] = p.x;
        arr[i * 3 + 1] = p.y;
        arr[i * 3 + 2] = p.z;
      }
      pos.needsUpdate = true;
      mesh.geometry.computeBoundingSphere();
    }
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
  }
}

const still = (): NetDent => ({ u: 0, v: 0, depth: 0 });

/**
 * How much of the dent reaches a point, along one direction of a sheet:
 * all of it where the ball pressed, none at the frame, falling off
 * almost straight between, as a net pulled at one point does.
 */
function tent(x: number, at: number, size: number): number {
  const c = Math.min(size * 0.95, Math.max(size * 0.05, at));
  const t = x < c ? x / c : (size - x) / (size - c);
  return Math.max(0, t) ** 1.25;
}

/** The slack a net hangs with at rest: the back billows out a little, the roof sags in. */
function sag(id: PanelId, u: number, v: number): number {
  const { w, h } = PANELS[id];
  const middle = Math.sin((Math.PI * u) / w) * Math.sin((Math.PI * v) / h);
  return id === "roof" ? -0.06 * middle : id === "back" ? 0.05 * middle : 0.02 * middle;
}
