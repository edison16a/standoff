/** Set when someone chooses to host on a phone or tablet, for the rest of the tab. */
const HOST_HERE_KEY = "standoff:host-here";

export interface DeviceHints {
  userAgent: string;
  /** True when the main pointer is a finger. */
  coarse: boolean;
  /** The longer side of the screen, in CSS pixels. */
  longSide: number;
  maxTouchPoints: number;
}

/**
 * True for a phone. Phones are controllers, so the site home on one opens
 * the join screen instead of the big screen. The user agent catches most
 * phones. A touch only screen that is small catches the rest, and an iPad
 * that calls itself a Mac is not a phone.
 */
export function looksLikePhone({ userAgent, coarse, longSide, maxTouchPoints }: DeviceHints): boolean {
  if (/iPhone|iPod|Android.+Mobile|Windows Phone|Mobi/i.test(userAgent)) return true;
  return coarse && maxTouchPoints > 0 && longSide < 1000;
}

export function readDeviceHints(): DeviceHints {
  return {
    userAgent: navigator.userAgent,
    coarse: window.matchMedia("(pointer: coarse)").matches,
    longSide: Math.max(window.screen.width, window.screen.height),
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
  };
}

/** Whether this tab should show the join screen as its home. */
export function phoneHome(): boolean {
  try {
    if (sessionStorage.getItem(HOST_HERE_KEY) === "1") return false;
  } catch {
    // No storage: go by the device alone.
  }
  return looksLikePhone(readDeviceHints());
}

/** Someone wants this phone or tablet to be the big screen after all. */
export function chooseHostHere(): void {
  try {
    sessionStorage.setItem(HOST_HERE_KEY, "1");
  } catch {
    // Without storage the choice lasts until the page reloads.
  }
}
