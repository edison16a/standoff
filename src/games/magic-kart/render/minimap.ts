import type { Track } from "../engine/track";
import type { RaceWorld } from "../engine/world";

export interface Dot {
  color: string;
  /** Players' dots are bigger than the computers'. */
  big: boolean;
}

/**
 * The whole track seen from above, with every kart as a coloured dot.
 * The outline is worked out once per track; each frame only the dots
 * move. A vanished kart is simply left off, which is half the point of
 * vanishing.
 */
export class Minimap {
  private track: Track | null = null;
  private path: [number, number][] = [];
  private scale = 1;
  private offset = { x: 0, y: 0 };

  private fit(track: Track, width: number, height: number): void {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const p of track.points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
    }
    const pad = 16;
    this.scale = Math.min((width - pad * 2) / (maxX - minX), (height - pad * 2) / (maxZ - minZ));
    // x runs right to left on screen so the map matches what the drivers see from behind the start line.
    this.offset = { x: width / 2 + ((minX + maxX) / 2) * this.scale, y: height / 2 + ((minZ + maxZ) / 2) * this.scale };
    this.path = track.points.filter((_, i) => i % 3 === 0).map((p) => this.project(p.x, p.z));
    this.track = track;
  }

  /** Forces a refit, after the canvas changes size. */
  reset(): void {
    this.track = null;
  }

  project(x: number, z: number): [number, number] {
    return [this.offset.x - x * this.scale, this.offset.y - z * this.scale];
  }

  draw(ctx: CanvasRenderingContext2D, world: RaceWorld, width: number, height: number, dot: (kartId: number) => Dot, lineColor: string): void {
    if (this.track !== world.track) this.fit(world.track, width, height);
    ctx.clearRect(0, 0, width, height);
    const trace = () => {
      ctx.beginPath();
      this.path.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath();
    };
    ctx.lineJoin = "round";
    trace();
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 4;
    ctx.stroke();

    // The finish line, as a small chequered bar across the road.
    const start = world.track.frameAt(0);
    const [a0, a1] = this.project(start.x + start.rx * 9, start.z + start.rz * 9);
    const [b0, b1] = this.project(start.x - start.rx * 9, start.z - start.rz * 9);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(a0, a1);
    ctx.lineTo(b0, b1);
    ctx.stroke();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = "#fff";
    ctx.stroke();
    ctx.setLineDash([]);

    // Computers first, leader last, so the players and the lead are on top.
    const order = [...world.karts].sort((a, b) => Number(a.seat !== null) - Number(b.seat !== null) || b.race.place - a.race.place);
    for (const kart of order) {
      if (kart.timers.ghost > 0) continue;
      const { color, big } = dot(kart.id);
      const [x, y] = this.project(kart.x, kart.z);
      ctx.beginPath();
      ctx.arc(x, y, big ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = big ? "#ffffff" : "rgba(20,20,30,0.9)";
      ctx.stroke();
    }
  }
}
