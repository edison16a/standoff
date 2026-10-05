import type { CharacterId } from "../../../characters";
import { emblemRegion, plateRegion, REGIONS } from "./atlas-layout";
import { inRegion, type Ctx } from "./atlas-draw";
import { drawEmblem } from "./emblems";

/** Each kart's race number and plate colours. */
export const PLATES: Record<CharacterId, { number: string; ink: string; edge: string }> = {
  blaze: { number: "7", ink: "#c92a0e", edge: "#ffc21a" },
  pip: { number: "3", ink: "#1f7a36", edge: "#ffd23f" },
  nova: { number: "99", ink: "#1b2a52", edge: "#5ff2ff" },
  mochi: { number: "8", ink: "#c2417e", edge: "#ff9cc8" },
};

/**
 * The stickers: every kart's emblem and number plate, Blaze's side
 * flames, a chequer stripe and two sponsor stickers. Everything outside
 * a sticker's outline stays see through, so it is cut out on the kart.
 */
export function drawBadges(ctx: Ctx): void {
  for (const id of ["blaze", "pip", "nova", "mochi"] as const) {
    inRegion(ctx, emblemRegion(id), (w) => drawEmblem(ctx, id, w));
    inRegion(ctx, plateRegion(id), (w, h) => drawPlate(ctx, id, w, h));
  }
  inRegion(ctx, REGIONS.flame, (w, h) => drawFlames(ctx, w, h));
  inRegion(ctx, REGIONS.stripe, (w, h) => {
    const s = w / 4;
    for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) {
      ctx.fillStyle = (x + y) / s % 2 === 0 ? "#f4f4f8" : "#18181e";
      ctx.fillRect(x, y, s, s);
    }
  });
  inRegion(ctx, REGIONS.stickerGrip, (w, h) => sticker(ctx, w, h, "#16161c", "#ffc21a", "MAGIC GRIP"));
  inRegion(ctx, REGIONS.stickerNitro, (w, h) => sticker(ctx, w, h, "#1f6dff", "#ffffff", "NITRO X"));
}

function drawPlate(ctx: Ctx, id: CharacterId, w: number, h: number): void {
  const plate = PLATES[id];
  ctx.fillStyle = plate.edge;
  ctx.beginPath();
  ctx.roundRect(4, 4, w - 8, h - 8, 22);
  ctx.fill();
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(1, "#e6e6ee");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(14, 14, w - 28, h - 28, 14);
  ctx.fill();
  ctx.fillStyle = plate.ink;
  ctx.font = `italic 900 ${Math.round(h * 0.66)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(plate.number, w / 2, h / 2 + 4);
}

/** Three licks of fire, yellow at the root to red at the tips, with a dark outline. */
function drawFlames(ctx: Ctx, w: number, h: number): void {
  const licks = [
    [0.06, 0.62, 0.98, 0.42, 0.36],
    [0.04, 0.5, 0.82, 0.18, 0.3],
    [0.08, 0.36, 0.7, 0.72, 0.28],
  ] as const;
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, "#fff3a0");
  g.addColorStop(0.35, "#ffc21a");
  g.addColorStop(0.7, "#ff7a1a");
  g.addColorStop(1, "#e3260f");
  for (const pass of [0, 1]) {
    for (const [x0, y0, x1, y1, t] of licks) {
      ctx.beginPath();
      ctx.moveTo(x0 * w, y0 * h - t * h * 0.5);
      ctx.bezierCurveTo(w * 0.4, y0 * h - t * h, w * 0.6, y1 * h - t * h * 0.2, x1 * w, y1 * h);
      ctx.bezierCurveTo(w * 0.55, y1 * h + t * h * 0.6, w * 0.35, y0 * h + t * h * 0.9, x0 * w, y0 * h + t * h * 0.5);
      ctx.closePath();
      if (pass === 0) {
        ctx.strokeStyle = "#5a0a04";
        ctx.lineWidth = 7;
        ctx.stroke();
      } else {
        ctx.fillStyle = g;
        ctx.fill();
      }
    }
  }
}

function sticker(ctx: Ctx, w: number, h: number, back: string, ink: string, text: string): void {
  ctx.fillStyle = back;
  ctx.beginPath();
  ctx.roundRect(3, 3, w - 6, h - 6, h / 2 - 3);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.font = `italic 900 ${Math.round(h * 0.52)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2 + 2);
}
