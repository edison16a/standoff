import type { Region } from "./atlas-layout";

export type Ctx = CanvasRenderingContext2D;

/** Runs a drawing clipped to a region of the atlas, with the region's top left as the origin. */
export function inRegion(ctx: Ctx, region: Region, draw: (w: number, h: number) => void): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(region.x, region.y, region.w, region.h);
  ctx.clip();
  ctx.translate(region.x, region.y);
  draw(region.w, region.h);
  ctx.restore();
}
