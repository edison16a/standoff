import type { Player } from "@/platform/games/game-api";
import { playerColor } from "@/games/kit/players";

/** A box on the page in CSS pixels, such as a player's zone. */
export type Box = { x: number; y: number; w: number; h: number };

/** The outline of a player's zone while they calibrate in it, so they can see which part of the screen is theirs. */
export function drawZone(ctx: CanvasRenderingContext2D, box: Box, colour: string): void {
  ctx.save();
  ctx.fillStyle = "rgba(10, 10, 20, 0.28)";
  ctx.strokeStyle = colour;
  ctx.lineWidth = 4;
  ctx.setLineDash([18, 10]);
  ctx.beginPath();
  ctx.roundRect(box.x + 8, box.y + 8, box.w - 16, box.h - 16, 18);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** A pulsing calibration target, with the name of everyone looking for it stacked on dark pills. */
export function drawTarget(ctx: CanvasRenderingContext2D, at: { x: number; y: number }, who: Player[], now: number, box: Box): void {
  const pulse = 1 + Math.sin(now / 220) * 0.08;
  const colour = playerColor(who[0]!.seat);
  ctx.save();
  ctx.lineWidth = 4;
  for (const [radius, alpha] of [[46, 1], [28, 0.8]] as const) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = colour;
    ctx.beginPath();
    ctx.arc(at.x, at.y, radius * pulse, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(at.x, at.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "600 16px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  who.forEach((player, i) => {
    const below = at.y + 78 + i * 30;
    const y = below > box.y + box.h - 24 ? at.y - 70 - i * 30 : below;
    const text = `${player.name}, point here`;
    // A dark pill behind the name, so it reads on any game's background.
    const width = ctx.measureText(text).width + 24;
    // Kept inside the zone, so a target near its edge never pushes the name off it.
    const x = Math.min(Math.max(at.x, box.x + width / 2 + 4), box.x + box.w - width / 2 - 4);
    ctx.fillStyle = "rgba(10, 10, 20, 0.78)";
    ctx.beginPath();
    ctx.roundRect(x - width / 2, y - 13, width, 26, 13);
    ctx.fill();
    ctx.fillStyle = playerColor(player.seat);
    ctx.fillText(text, x, y);
  });
  ctx.restore();
}

/** A player's laser dot: a glow, a ring in their colour round a white core, and their name if given. */
export function drawDot(ctx: CanvasRenderingContext2D, at: { x: number; y: number }, colour: string, name: string, box: Box): void {
  ctx.save();
  const glow = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, 28);
  glow.addColorStop(0, colour);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.arc(at.x, at.y, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(at.x, at.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = colour;
  ctx.beginPath();
  ctx.arc(at.x, at.y, 11, 0, Math.PI * 2);
  ctx.stroke();
  if (name) {
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.fillStyle = colour;
    // The name flips to the dot's other side near the right or top edge, so it stays in sight too.
    const flipX = at.x + 16 + ctx.measureText(name).width > box.x + box.w;
    ctx.textAlign = flipX ? "right" : "left";
    ctx.fillText(name, flipX ? at.x - 16 : at.x + 16, at.y - 14 < box.y + 12 ? at.y + 26 : at.y - 14);
  }
  ctx.restore();
}
