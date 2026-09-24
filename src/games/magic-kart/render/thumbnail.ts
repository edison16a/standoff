import { Track } from "../engine/track";
import type { TrackDef } from "../tracks/types";
import { THEMES } from "./themes";

const cache = new Map<string, Track>();

/**
 * A map card's picture: the track's shape seen from above, in the map's
 * own colours, with its kerbs, its finish line and a dot for each jump.
 */
export function drawThumbnail(canvas: HTMLCanvasElement, def: TrackDef): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const theme = THEMES[def.theme];
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, theme.skyTop);
  bg.addColorStop(1, theme.floating ? theme.skyBottom : theme.shoulder);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  let track = cache.get(def.id);
  if (!track) {
    track = new Track(def);
    cache.set(def.id, track);
  }
  const xs = track.points.map((p) => p.x);
  const zs = track.points.map((p) => p.z);
  const [minX, maxX, minZ, maxZ] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  const scale = Math.min((w - 36) / (maxX - minX), (h - 36) / (maxZ - minZ));
  const project = (x: number, z: number) => [w / 2 - (x - (minX + maxX) / 2) * scale, h / 2 - (z - (minZ + maxZ) / 2) * scale] as const;
  ctx.beginPath();
  track.points.forEach((p, i) => {
    const [x, y] = project(p.x, p.z);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 15;
  ctx.stroke();
  ctx.strokeStyle = theme.kerb[0]!;
  ctx.lineWidth = 12;
  ctx.stroke();
  ctx.strokeStyle = theme.road;
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = theme.centre;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.setLineDash([]);

  for (const ramp of track.ramps) {
    const p = track.frameAt(ramp.end);
    const [x, y] = project(p.x, p.z);
    ctx.fillStyle = theme.pad;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  const start = track.frameAt(0);
  const [sx, sy] = project(start.x, start.z);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(sx - 7, sy - 2, 14, 4);
}
