import type { Payload } from "@/platform/protocol";
import type { KeyInput } from "./key-state";
import type { VirtualState } from "./virtual-phone";

/**
 * What the host page and its phone panel say to each other. The panel is
 * a frame of its own, so the game's phone screen gets a phone sized
 * window, and its CSS and media queries work as on a real phone. Messages
 * cross by postMessage, which copies them, so neither side ever holds the
 * other's objects.
 */
const TAG = "standoff-keyboard";

/** From the phone panel up to the host page. */
export type PanelMessage =
  | { type: "status"; state: VirtualState }
  /** Something the host sent this seat, for the binding's `last`. */
  | { type: "host"; payload: Payload }
  /** A key pressed while the panel had focus. */
  | { type: "key"; input: KeyInput }
  /** The panel lost focus, maybe to another window altogether. */
  | { type: "blur" };

/** From the host page down to the phone panel. */
export type PageMessage =
  /** The binding sending as this seat. */
  | { type: "send"; payload: Payload; lossy: boolean }
  /** Kinds the keyboard sends, which the phone screen's own copies give way to. */
  | { type: "replace"; kinds: readonly string[] };

type Tagged<T> = T & { tag: typeof TAG };

export function post<T extends PanelMessage | PageMessage>(target: Window | null | undefined, message: T): void {
  target?.postMessage({ ...message, tag: TAG } satisfies Tagged<T>, location.origin);
}

/** A message from our own other side, never from another origin or another frame. */
export function receive<T extends PanelMessage | PageMessage>(event: MessageEvent, from: Window | null | undefined): T | null {
  if (event.origin !== location.origin || !from || event.source !== from) return null;
  const data = event.data as Partial<Tagged<T>> | null;
  if (!data || typeof data !== "object" || data.tag !== TAG || typeof data.type !== "string") return null;
  return data as unknown as T;
}
