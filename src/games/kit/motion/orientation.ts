import { quatFromDeviceEuler, type Quat } from "./math3d";

/**
 * Calls `onQuat` with the phone's orientation on every sensor reading.
 * `onLive` fires once real readings arrive, because desktop browsers fire
 * the event with every value null. Returns an unsubscribe.
 */
export function subscribeOrientation(onQuat: (q: Quat, timeMs: number) => void, onLive?: () => void): () => void {
  let live = false;
  const handle = (event: DeviceOrientationEvent) => {
    if (event.alpha === null || event.beta === null || event.gamma === null) return;
    if (!live) {
      live = true;
      onLive?.();
    }
    onQuat(quatFromDeviceEuler(event.alpha, event.beta, event.gamma), event.timeStamp);
  };
  window.addEventListener("deviceorientation", handle);
  return () => window.removeEventListener("deviceorientation", handle);
}
