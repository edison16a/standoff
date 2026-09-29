import type { AimTarget } from "./aim-targets";

const PLACE: Record<AimTarget, string> = {
  center: "the middle",
  "top-left": "the top left",
  "top-right": "the top right",
  "bottom-right": "the bottom right",
  "bottom-left": "the bottom left",
};

/**
 * The words for one target of the calibration. The first explains the
 * grip and the hold; the rest just say where. A player with their own
 * part of the big screen is pointed at their view, not the screen.
 */
export function targetCopy(target: AimTarget, index: number, zoned: boolean): { title: string; text: string } {
  const where = PLACE[target];
  const of = zoned ? " of your view" : "";
  if (index === 0) {
    return {
      title: `Point at ${where}${of}`,
      text: zoned
        ? "Your view is outlined in your colour on the big screen. Hold your phone flat like a remote, top edge toward it. Point at the target and hold still until the ring fills."
        : "Hold your phone flat like a remote, top edge toward the big screen. Point at the target and hold still until the ring fills.",
    };
  }
  if (target === "center") return { title: `Back to ${where}${of}`, text: "Point at the middle once more and hold still. It makes the aim more exact." };
  const corner = where.replace("the ", "");
  return { title: `Now ${where}${of}`, text: `Point at the target near the ${corner} corner${of} and hold still.` };
}

export const TEST_COPY = {
  title: "Try it",
  text: (zoned: boolean) => `Move the phone around. Your dot ${zoned ? "in your view" : "on the big screen"}, and the one below, should follow where you point.`,
  button: "Looks good",
};

export function touchCopy(zoned: boolean): string {
  return `This phone has no motion sensors, so drag on the pad to move your dot ${zoned ? "in your view" : "on the big screen"}.`;
}
