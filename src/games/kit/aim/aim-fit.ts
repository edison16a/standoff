import { wrapAngle } from "@/games/kit/motion/math3d";
import { DEFAULT_SPAN, MIN_SPAN, type AimCalibration, type Pointing, type ScreenPoint } from "./aim-math";

/** One calibration reading: where the target was on the screen, and where the phone pointed at it. */
export interface AimSample {
  target: ScreenPoint;
  reading: Pointing;
}

type Side = "left" | "right" | "up" | "down";

const mean = (values: readonly number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

/**
 * The calibration from any set of targets, three or thirty. The centre is
 * the average of the middle readings. Every other target gives a span for
 * the side of the screen it sits on, scaled out from the target to the
 * true edge, and each side averages its spans. A target pointed the wrong
 * way is left out, and a side with no good reading borrows the opposite
 * side's span. Null until there is a middle reading.
 */
export function fitCalibration(samples: readonly AimSample[]): AimCalibration | null {
  const middles = samples.filter((s) => s.target.x === 0 && s.target.y === 0).map((s) => s.reading);
  const first = middles[0];
  if (!first) return null;
  // Headings are averaged as offsets from the first, so readings either side of north never cancel out.
  const center: Pointing = {
    yaw: wrapAngle(first.yaw + mean(middles.map((m) => wrapAngle(m.yaw - first.yaw)))!),
    pitch: mean(middles.map((m) => m.pitch))!,
  };
  const reads: Record<Side, number[]> = { left: [], right: [], up: [], down: [] };
  for (const { target, reading } of samples) {
    const yaw = wrapAngle(reading.yaw - center.yaw) / target.x;
    const pitch = (reading.pitch - center.pitch) / target.y;
    if (target.x !== 0 && yaw >= MIN_SPAN) reads[target.x < 0 ? "left" : "right"].push(yaw);
    if (target.y !== 0 && pitch >= MIN_SPAN) reads[target.y < 0 ? "down" : "up"].push(pitch);
  }
  const pick = (own: Side, other: Side, fallback: number) => mean(reads[own]) ?? mean(reads[other]) ?? fallback;
  return {
    center,
    left: pick("left", "right", DEFAULT_SPAN.x),
    right: pick("right", "left", DEFAULT_SPAN.x),
    up: pick("up", "down", DEFAULT_SPAN.y),
    down: pick("down", "up", DEFAULT_SPAN.y),
  };
}
