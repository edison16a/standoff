import * as THREE from "three";
import { BALL, PITCH } from "../../engine/tuning";
import type { BallView } from "../../engine/view";
import { merge, paint, rod } from "../models/geo";

const GW = PITCH.goalHalfWidth;
const GH = PITCH.goalHeight;
const GD = PITCH.goalDepth;
const HL = PITCH.halfLength;
const CELL = 0.12;

/**
 * One goal: round white posts and bar, a slim frame behind holding the
 * net, and the net itself, which bulges where the ball hits it and
 * sways back. `end` is -1 for the left goal and 1 for the right.
 */
export class GoalModel {
  readonly group = new THREE.Group();
  private readonly back: THREE.Mesh;
  private readonly rest: Float32Array;
  private bulge = 0;
  private bulgeV = 0;
  private hitZ = 0;
  private hitY = 1;
  private lastVx = 0;
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
    const plane = (w: number, h: number, sw: number, sh: number) => {
      const g = new THREE.PlaneGeometry(w, h, sw, sh);
      const uv = g.getAttribute("uv") as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / CELL, (uv.getY(i) * h) / CELL);
      return g;
    };
    this.back = new THREE.Mesh(plane(GW * 2, GH, 28, 14), net);
    this.back.rotation.y = end > 0 ? -Math.PI / 2 : Math.PI / 2;
    this.back.position.set(bx, GH / 2, 0);
    this.rest = (this.back.geometry.getAttribute("position").array as Float32Array).slice();
    const roof = new THREE.Mesh(plane(GD, GW * 2, 6, 12), net);
    roof.rotation.x = -Math.PI / 2;
    roof.position.set((x + bx) / 2, GH, 0);
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(plane(GD, GH, 6, 8), net);
      wall.position.set((x + bx) / 2, GH / 2, side * GW);
      this.group.add(wall);
      this.disposables.push(wall.geometry);
    }
    for (const m of [this.back, roof]) m.castShadow = true;
    this.group.add(this.back, roof);
    this.disposables.push(frame, frameMat, net, this.back.geometry, roof.geometry);
  }

  /**
   * Watches the ball: when it hits the back of this net the net is
   * punched out under it and springs back, and a ball resting against
   * it keeps a gentle sag.
   */
  update(ball: BallView, dt: number): void {
    const depth = ball.x * this.end;
    const inside = depth > HL && Math.abs(ball.z) < GW && ball.y < GH;
    const outward = ball.vx * this.end;
    if (inside && depth > HL + GD - BALL.radius - 0.2 && this.lastVx > 1 && outward < this.lastVx * 0.5) {
      this.bulgeV += Math.min(9, this.lastVx * 0.55);
      this.hitZ = ball.z;
      this.hitY = ball.y;
    }
    this.lastVx = inside ? outward : 0;
    const resting = inside && depth > HL + GD - BALL.radius - 0.05 ? 0.06 : 0;
    // A damped spring toward the resting sag.
    this.bulgeV += (-(this.bulge - resting) * 60 - this.bulgeV * 6) * dt;
    this.bulge += this.bulgeV * dt;
    this.deform();
  }

  private deform(): void {
    const pos = this.back.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const amount = this.bulge;
    for (let i = 0; i < pos.count; i++) {
      const px = this.rest[i * 3]!;
      const py = this.rest[i * 3 + 1]!;
      // Plane space: x runs across the goal, y up from the middle of the net.
      const worldZ = this.end > 0 ? px : -px;
      const worldY = py + GH / 2;
      const d2 = (worldZ - this.hitZ) ** 2 + (worldY - this.hitY) ** 2;
      const edge = Math.sin((Math.PI * (px + GW)) / (2 * GW)) * Math.sin((Math.PI * worldY) / GH);
      arr[i * 3 + 2] = -amount * Math.exp(-d2 / 0.35) * edge;
    }
    pos.needsUpdate = true;
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
  }
}
