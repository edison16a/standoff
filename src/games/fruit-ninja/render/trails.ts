import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DynamicDrawUsage, Float32BufferAttribute, Mesh, Sprite, SpriteMaterial, type Scene, type ShaderMaterial } from "three";
import type { BladeId } from "../blades";
import type { Seat } from "../engine/events";
import { glowTexture } from "./textures/sprites";
import { setTrailLook, trailMaterial } from "./trail-shader";

/** One player's blade as the renderer sees it this frame. */
export interface BladeFrame {
  seat: Seat;
  x: number;
  y: number;
  blade: BladeId;
  color: string;
  stunned: boolean;
}

/** How long a point stays in the trail, in seconds. */
const TRAIL_S = 0.2;
const POINTS = 64;
const HEAD_WIDTH = 0.22;
/** Trails float above the fruit so they are never hidden behind one. */
const Z = 1.2;

interface Trail {
  mesh: Mesh;
  material: ShaderMaterial;
  positions: Float32Array;
  /** How far along the trail each point is by age, from 0 at the tip to 1 at the tail. */
  alongs: Float32Array;
  history: { x: number; y: number; t: number }[];
  tip: Sprite;
  core: Sprite;
  blade: BladeId;
  color: string;
  jitter: number[];
  jitterAt: number;
}

/**
 * The glowing ribbon behind every blade, in its chosen style and edged
 * with its player's colour, and a bright dot at the tip that shows where
 * the phone points even when the blade is still.
 */
export class BladeTrails {
  private readonly trails = new Map<Seat, Trail>();

  constructor(private readonly scene: Scene) {}

  /** Draws this frame's blades and returns each blade's speed, for sparks and whooshes. */
  update(blades: readonly BladeFrame[], time: number): Map<Seat, number> {
    const speeds = new Map<Seat, number>();
    const seen = new Set<Seat>();
    for (const blade of blades) {
      seen.add(blade.seat);
      const trail = this.trails.get(blade.seat) ?? this.create(blade);
      if (trail.blade !== blade.blade || trail.color !== blade.color) {
        setTrailLook(trail.material, blade.blade, blade.color);
        trail.tip.material.color.set(blade.color);
        trail.blade = blade.blade;
        trail.color = blade.color;
      }
      trail.history.push({ x: blade.x, y: blade.y, t: time });
      while (trail.history.length > 2 && time - trail.history[0]!.t > TRAIL_S) trail.history.shift();
      speeds.set(blade.seat, this.speed(trail));
      this.build(trail, time, blade.blade === "lightning");
      trail.material.uniforms.uTime!.value = time;
      trail.material.uniforms.uOpacity!.value = blade.stunned ? 0.25 : 1;
      const flash = blade.stunned ? 0.4 + 0.4 * Math.sin(time * 30) : 1;
      trail.tip.position.set(blade.x, blade.y, Z + 0.05);
      trail.core.position.set(blade.x, blade.y, Z + 0.06);
      trail.tip.scale.setScalar(0.9 * flash);
      trail.core.scale.setScalar(0.28);
      trail.core.material.color.set(blade.stunned ? "#777777" : "#ffffff");
    }
    for (const [seat, trail] of this.trails) {
      if (!seen.has(seat)) this.remove(seat, trail);
    }
    return speeds;
  }

  dispose(): void {
    for (const [seat, trail] of this.trails) this.remove(seat, trail);
  }

  private remove(seat: Seat, trail: Trail): void {
    this.scene.remove(trail.mesh, trail.tip, trail.core);
    trail.mesh.geometry.dispose();
    trail.material.dispose();
    trail.tip.material.dispose();
    trail.core.material.dispose();
    this.trails.delete(seat);
  }

  private speed(trail: Trail): number {
    const h = trail.history;
    if (h.length < 2) return 0;
    const a = h[h.length - 2]!;
    const b = h[h.length - 1]!;
    const dt = b.t - a.t;
    return dt > 0 ? Math.hypot(b.x - a.x, b.y - a.y) / dt : 0;
  }

  /** Rebuilds the ribbon from the recent path, smoothed with a Catmull Rom spline. */
  private build(trail: Trail, time: number, bolt: boolean): void {
    const h = trail.history;
    const samples: { x: number; y: number; t: number }[] = [];
    for (let i = h.length - 1; i > 0 && samples.length < POINTS; i--) {
      const p0 = h[Math.min(h.length - 1, i + 1)]!;
      const p1 = h[i]!;
      const p2 = h[i - 1]!;
      const p3 = h[Math.max(0, i - 2)]!;
      for (let s = 0; s < 3 && samples.length < POINTS; s++) {
        const u = s / 3;
        samples.push({ x: spline(p0.x, p1.x, p2.x, p3.x, u), y: spline(p0.y, p1.y, p2.y, p3.y, u), t: p1.t + (p2.t - p1.t) * u });
      }
    }
    if (bolt && time - trail.jitterAt > 0.045) {
      trail.jitter = Array.from({ length: POINTS }, () => (Math.random() - 0.5) * 2);
      trail.jitterAt = time;
    }
    const pos = trail.positions;
    const last = samples[samples.length - 1] ?? { x: h[0]?.x ?? 0, y: h[0]?.y ?? 0, t: time };
    for (let i = 0; i < POINTS; i++) {
      const p = samples[i] ?? last;
      const prev = samples[Math.max(0, i - 1)] ?? p;
      const next = samples[Math.min(samples.length - 1, i + 1)] ?? p;
      let nx = -(next.y - prev.y);
      let ny = next.x - prev.x;
      const len = Math.hypot(nx, ny) || 1;
      nx /= len;
      ny /= len;
      const along = Math.min(1, (time - p.t) / TRAIL_S);
      const width = samples[i] ? HEAD_WIDTH * Math.pow(1 - along, 0.6) : 0;
      const shake = bolt ? (trail.jitter[i] ?? 0) * 0.16 * Math.min(1, i / 4) : 0;
      const cx = p.x + nx * shake;
      const cy = p.y + ny * shake;
      const k = i * 6;
      pos[k] = cx + nx * width;
      pos[k + 1] = cy + ny * width;
      pos[k + 2] = Z;
      pos[k + 3] = cx - nx * width;
      pos[k + 4] = cy - ny * width;
      pos[k + 5] = Z;
      trail.alongs[i * 2] = trail.alongs[i * 2 + 1] = along;
    }
    trail.mesh.geometry.getAttribute("position").needsUpdate = true;
    trail.mesh.geometry.getAttribute("aAlong").needsUpdate = true;
  }

  private create(blade: BladeFrame): Trail {
    const positions = new Float32Array(POINTS * 6);
    const alongs = new Float32Array(POINTS * 2);
    const side: number[] = [];
    for (let i = 0; i < POINTS; i++) side.push(1, -1);
    const index: number[] = [];
    for (let i = 0; i < POINTS - 1; i++) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(positions, 3).setUsage(DynamicDrawUsage));
    geo.setAttribute("aAlong", new BufferAttribute(alongs, 1).setUsage(DynamicDrawUsage));
    geo.setAttribute("aSide", new Float32BufferAttribute(side, 1));
    geo.setIndex(index);
    const material = trailMaterial(blade.blade, blade.color);
    const mesh = new Mesh(geo, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 40;
    const sprite = (colour: string) => {
      const s = new Sprite(new SpriteMaterial({ map: glowTexture(), color: new Color(colour), blending: AdditiveBlending, depthTest: false, depthWrite: false }));
      s.renderOrder = 41;
      return s;
    };
    const trail: Trail = { mesh, material, positions, alongs, history: [], tip: sprite(blade.color), core: sprite("#ffffff"), blade: blade.blade, color: blade.color, jitter: [], jitterAt: 0 };
    this.scene.add(mesh, trail.tip, trail.core);
    this.trails.set(blade.seat, trail);
    return trail;
  }
}

function spline(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
