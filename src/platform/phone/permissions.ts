/** iOS 13+ adds a static permission request to both event types. */
type PermissionTarget = { requestPermission?: () => Promise<"granted" | "denied"> };

/**
 * True where motion access can only be granted inside a tap (iOS), so a
 * reloaded controller has to ask for one before it can carry on.
 */
export function motionNeedsTap(): boolean {
  if (!window.isSecureContext || typeof DeviceMotionEvent === "undefined") return false;
  return typeof (DeviceMotionEvent as unknown as PermissionTarget).requestPermission === "function";
}

/**
 * Asks for motion access where the browser requires it, and reports
 * whether sensors can be read at all. On iOS the request has to run inside
 * a tap, which is why joining is a button. Browsers only expose the
 * sensors on secure pages, which is why the local server runs HTTPS.
 */
export async function requestMotion(): Promise<"granted" | "unavailable"> {
  if (!window.isSecureContext) return "unavailable";
  if (typeof DeviceMotionEvent === "undefined" || typeof DeviceOrientationEvent === "undefined") return "unavailable";
  const targets = [DeviceMotionEvent, DeviceOrientationEvent] as unknown as PermissionTarget[];
  for (const target of targets) {
    if (typeof target.requestPermission !== "function") continue;
    try {
      if ((await target.requestPermission()) !== "granted") return "unavailable";
    } catch {
      return "unavailable";
    }
  }
  return "granted";
}
