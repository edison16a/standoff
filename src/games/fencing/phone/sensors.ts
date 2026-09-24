import { quatFromDeviceEuler } from "@/games/fencing/motion/math3d";
import type { MotionPipeline } from "@/games/fencing/motion/motion-pipeline";

export type MotionSupport = "ok" | "insecure" | "unsupported";

/** iOS 13+ adds a static permission request to both event types. */
type PermissionTarget = { requestPermission?: () => Promise<"granted" | "denied"> };

/**
 * Whether this browser can give us motion at all. Browsers only expose
 * the sensors on secure pages, which is why the server runs HTTPS for phones.
 */
export function motionSupport(): MotionSupport {
  if (!window.isSecureContext) return "insecure";
  if (typeof DeviceMotionEvent === "undefined" || typeof DeviceOrientationEvent === "undefined") return "unsupported";
  return "ok";
}

/**
 * Asks for motion access where the browser requires it. On iOS this has
 * to run inside a tap, which is why the join screen has an enable button
 * rather than asking on load. Elsewhere there is nothing to ask.
 */
export async function requestMotionPermission(): Promise<boolean> {
  const targets = [DeviceMotionEvent, DeviceOrientationEvent] as unknown as PermissionTarget[];
  for (const target of targets) {
    if (typeof target.requestPermission !== "function") continue;
    try {
      if ((await target.requestPermission()) !== "granted") return false;
    } catch {
      return false;
    }
  }
  return true;
}

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
    pipeline.onOrientation(quatFromDeviceEuler(event.alpha, event.beta, event.gamma));
  };
  const onMotion = (event: DeviceMotionEvent) => {
    const toVec = (a: DeviceMotionEventAcceleration | null) =>
      a && a.x !== null && a.y !== null && a.z !== null ? { x: a.x, y: a.y, z: a.z } : null;
    pipeline.onMotion({
      t: event.timeStamp,
      acceleration: toVec(event.acceleration),
      accelerationIncludingGravity: toVec(event.accelerationIncludingGravity),
    });
  };

  window.addEventListener("deviceorientation", onOrientation);
  window.addEventListener("devicemotion", onMotion);
  return () => {
    window.removeEventListener("deviceorientation", onOrientation);
    window.removeEventListener("devicemotion", onMotion);
  };
}
