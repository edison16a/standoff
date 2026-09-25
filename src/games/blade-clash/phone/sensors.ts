import { quatFromDeviceEuler } from "@/games/kit/motion/math3d";
import type { MotionPipeline } from "@/games/blade-clash/motion/motion-pipeline";

/**
 * Feeds live orientation and motion events into the pipeline. Returns an
 * unsubscribe, and reports once real readings arrive, because desktop
 * browsers fire the events with every value null.
 */
export function subscribeSensors(pipeline: MotionPipeline, onLive: () => void): () => void {
  let live = false;
  const markLive = () => {
    if (live) return;
    live = true;
    onLive();
  };

  const onOrientation = (event: DeviceOrientationEvent) => {
    if (event.alpha === null || event.beta === null || event.gamma === null) return;
    markLive();
    pipeline.onOrientation(quatFromDeviceEuler(event.alpha, event.beta, event.gamma), event.timeStamp);
  };
  const onMotion = (event: DeviceMotionEvent) => {
    const toVec = (a: DeviceMotionEventAcceleration | null) =>
      a && a.x !== null && a.y !== null && a.z !== null ? { x: a.x, y: a.y, z: a.z } : null;
    const spin = event.rotationRate;
    // The spec names rates by Euler angle: beta turns around x, gamma around y, alpha around z.
    const rotationRate = spin && spin.alpha !== null && spin.beta !== null && spin.gamma !== null ? { x: spin.beta, y: spin.gamma, z: spin.alpha } : null;
    pipeline.onMotion({
      t: event.timeStamp,
      acceleration: toVec(event.acceleration),
      accelerationIncludingGravity: toVec(event.accelerationIncludingGravity),
      rotationRate,
    });
  };

  window.addEventListener("deviceorientation", onOrientation);
  window.addEventListener("devicemotion", onMotion);
  return () => {
    window.removeEventListener("deviceorientation", onOrientation);
    window.removeEventListener("devicemotion", onMotion);
  };
}
