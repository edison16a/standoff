import type { Point } from "../engine/geometry";

/** Where the video's picture lands inside a box, in the box's pixels. */
export interface Fit {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Places a video in a box the way CSS object-fit does. "cover" fills the
 * box and crops the overflow, "contain" shows it all with bars. Drawing on
 * top uses the same numbers, so skeletons sit exactly on the players.
 */
export function fitVideo(videoWidth: number, videoHeight: number, boxWidth: number, boxHeight: number, mode: "cover" | "contain"): Fit {
  if (videoWidth <= 0 || videoHeight <= 0) return { x: 0, y: 0, width: boxWidth, height: boxHeight };
  const scaleX = boxWidth / videoWidth;
  const scaleY = boxHeight / videoHeight;
  const scale = mode === "cover" ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
  const width = videoWidth * scale;
  const height = videoHeight * scale;
  return { x: (boxWidth - width) / 2, y: (boxHeight - height) / 2, width, height };
}

/** A point in the kit's mirrored picture space, in the box's pixels. The preview is mirrored the same way. */
export function toBox(fit: Fit, point: Point): Point {
  return { x: fit.x + point.x * fit.width, y: fit.y + point.y * fit.height };
}
