import type { AimTarget } from "./aim-targets";

/** Each target's page title, short like Blade Clash's, since the picture shows where. */
const TITLES: Record<AimTarget, string> = {
  center: "Point at the middle",
  "top-left": "Top left corner",
  "top-right": "Top right corner",
  "bottom-right": "Bottom right corner",
  "bottom-left": "Bottom left corner",
};

/** The title for one target of the calibration. The middle asked for again says so. */
export function targetTitle(target: AimTarget, index: number): string {
  return target === "center" && index > 0 ? "Back to the middle" : TITLES[target];
}

/** The first page: how to hold the phone. A player with their own part of the big screen is pointed at their view. */
export const HOLD_COPY = {
  title: "Hold it like a remote",
  lead: "Hold your phone flat like a remote, screen up.",
  text: (zoned: boolean) =>
    zoned
      ? "Point its top edge at your view on the big screen, lit in your colour. Then point where each page asks and hold still."
      : "Point its top edge at the big screen. Then point where each page asks and hold still.",
};

export const TEST_COPY = {
  title: "Your aim follows",
  lead: (zoned: boolean) => `Point anywhere ${zoned ? "in your view" : "on the screen"}. Your dot goes there.`,
  text: "This dot and the one on the big screen should follow where you point.",
  button: "Looks good",
};

export const TOUCH_COPY = {
  title: "Aim by dragging",
  lead: "No motion sensors here, so you aim with your finger.",
  text: (zoned: boolean) => `Drag on the pad to move your dot ${zoned ? "in your view" : "on the big screen"}.`,
};
