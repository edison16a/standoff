import type { CharacterId } from "../../../characters";
import type { Ctx } from "./atlas-draw";

/**
 * Each kart's own badge, drawn on a square: a flame for Blaze, a lily pad
 * for Pip, a comet for Nova and a steamed bun for Mochi. Worn on the nose,
 * the hub caps and the steering wheel boss.
 */
export function drawEmblem(ctx: Ctx, id: CharacterId, s: number): void {
  const c = s / 2;
  ctx.lineJoin = "round";
  EMBLEMS[id](ctx, c, s);
}

function ring(ctx: Ctx, c: number, r: number, fill: string | CanvasGradient, edge: string, width: number): void {
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = width;
  ctx.strokeStyle = edge;
  ctx.stroke();
}

function shine(ctx: Ctx, c: number, r: number): void {
  const g = ctx.createLinearGradient(0, c - r, 0, c);
  g.addColorStop(0, "rgba(255,255,255,0.4)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(c, c - r * 0.45, r * 0.78, r * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();
}

const EMBLEMS: Record<CharacterId, (ctx: Ctx, c: number, s: number) => void> = {
  blaze(ctx, c) {
    const g = ctx.createRadialGradient(c, c * 0.8, 10, c, c, c);
    g.addColorStop(0, "#ff5a2c");
    g.addColorStop(1, "#8f1608");
    ring(ctx, c, c - 12, g, "#ffc21a", 14);
    // A flame with fox ear tips, the Flame Rod's mark.
    ctx.beginPath();
    ctx.moveTo(c, c + 78);
    ctx.bezierCurveTo(c - 70, c + 70, c - 78, c - 10, c - 46, c - 72);
    ctx.bezierCurveTo(c - 36, c - 30, c - 22, c - 26, c - 14, c - 40);
    ctx.bezierCurveTo(c - 6, c - 70, c + 6, c - 70, c + 14, c - 40);
    ctx.bezierCurveTo(c + 22, c - 26, c + 36, c - 30, c + 46, c - 72);
    ctx.bezierCurveTo(c + 78, c - 10, c + 70, c + 70, c, c + 78);
    const f = ctx.createLinearGradient(0, c - 72, 0, c + 78);
    f.addColorStop(0, "#fff3a0");
    f.addColorStop(0.5, "#ffc21a");
    f.addColorStop(1, "#ff8a1a");
    ctx.fillStyle = f;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#5a0a04";
    ctx.stroke();
    shine(ctx, c, c - 20);
  },
  pip(ctx, c) {
    // A rounded shield in pond greens with a lily pad and a pink flower.
    ctx.beginPath();
    ctx.moveTo(c, 18);
    ctx.bezierCurveTo(c + 70, 30, c + 104, 30, c + 104, 46);
    ctx.bezierCurveTo(c + 104, c + 70, c + 50, c + 100, c, c + 112);
    ctx.bezierCurveTo(c - 50, c + 100, c - 104, c + 70, c - 104, 46);
    ctx.bezierCurveTo(c - 104, 30, c - 70, 30, c, 18);
    const g = ctx.createLinearGradient(0, 18, 0, c * 2);
    g.addColorStop(0, "#5fe07a");
    g.addColorStop(1, "#14692c");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 12;
    ctx.strokeStyle = "#fff4c8";
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(c, c + 6);
    ctx.arc(c, c + 6, 62, -Math.PI / 2 + 0.35, -Math.PI / 2 - 0.35 + Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = "#b8f08a";
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#1f7a36";
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(c + Math.cos(a) * 16, c - 14 + Math.sin(a) * 16, 16, 9, a, 0, Math.PI * 2);
      ctx.fillStyle = "#ff7fb0";
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(c, c - 14, 9, 0, Math.PI * 2);
    ctx.fillStyle = "#ffe14d";
    ctx.fill();
    shine(ctx, c, c - 30);
  },
  nova(ctx, c) {
    // A navy hexagon with a neon edge, and a four point comet trailing light.
    ctx.beginPath();
    for (let k = 0; k < 6; k++) ctx.lineTo(c + Math.cos((k / 6) * Math.PI * 2) * (c - 14), c + Math.sin((k / 6) * Math.PI * 2) * (c - 14));
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, c * 2);
    g.addColorStop(0, "#2f4a8f");
    g.addColorStop(1, "#0f1838");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 12;
    ctx.strokeStyle = "#5ff2ff";
    ctx.stroke();
    const t = ctx.createLinearGradient(c - 80, c + 60, c + 20, c - 20);
    t.addColorStop(0, "rgba(95,242,255,0)");
    t.addColorStop(1, "#5ff2ff");
    ctx.fillStyle = t;
    ctx.beginPath();
    ctx.moveTo(c - 92, c + 70);
    ctx.lineTo(c + 18, c - 30);
    ctx.lineTo(c + 34, c - 6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const r = k % 2 === 0 ? 56 : 14;
      const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(c + 20 + Math.cos(a) * r, c - 22 + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    shine(ctx, c, c - 24);
  },
  mochi(ctx, c) {
    // A scalloped cookie edge, a pink face, a steamed bun and a heart.
    ctx.beginPath();
    for (let k = 0; k <= 96; k++) {
      const a = (k / 96) * Math.PI * 2;
      const r = c - 14 + Math.cos(a * 16) * 6;
      ctx.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
    }
    ctx.fillStyle = "#fff4e4";
    ctx.fill();
    const g = ctx.createRadialGradient(c, c - 20, 10, c, c, c - 30);
    g.addColorStop(0, "#ffb3d4");
    g.addColorStop(1, "#e2508f");
    ring(ctx, c, c - 34, g, "#c2417e", 6);
    ctx.beginPath();
    ctx.ellipse(c, c + 18, 62, 40, 0, Math.PI, 0);
    ctx.lineTo(c + 62, c + 30);
    ctx.quadraticCurveTo(c, c + 46, c - 62, c + 30);
    ctx.closePath();
    ctx.fillStyle = "#fffaf0";
    ctx.fill();
    ctx.strokeStyle = "#d9c6b0";
    ctx.lineWidth = 4;
    for (const x of [-30, -12, 6, 24]) {
      ctx.beginPath();
      ctx.moveTo(c + x, c - 12);
      ctx.quadraticCurveTo(c + x + 10, c + 2, c + x + 4, c + 18);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(c, c - 30);
    ctx.bezierCurveTo(c - 26, c - 54, c - 50, c - 26, c, c - 2 - 20);
    ctx.bezierCurveTo(c + 50, c - 26, c + 26, c - 54, c, c - 30);
    ctx.fillStyle = "#ff2d6a";
    ctx.fill();
    shine(ctx, c, c - 36);
  },
};
