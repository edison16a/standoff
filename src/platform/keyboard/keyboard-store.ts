import { create } from "zustand";
import type { VirtualState } from "./virtual-phone";

const KEY = "standoff:keyboard-player";

/**
 * The keyboard player on the host page: which room it was turned on for,
 * what its phone panel reports, and how the tester has the panel and the
 * card. The room is kept for the tab, so a reload that resumes the room
 * seats it again, while a new room starts without it.
 */
export interface KeyboardUi {
  /** The room code it is on for, or null when off. */
  room: string | null;
  /** The phone panel's last word on its seat. Null until it has spoken. */
  phone: VirtualState | null;
  /** The phone panel folded down to its title bar. */
  folded: boolean;
  /** The controls card put away with Escape. */
  cardHidden: boolean;
  /** The phone held sideways, for controllers made for landscape. */
  sideways: boolean;
}

function savedRoom(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export const useKeyboardUi = create<KeyboardUi>(() => ({
  room: typeof window !== "undefined" ? savedRoom() : null,
  phone: null,
  folded: false,
  cardHidden: false,
  sideways: false,
}));

/** Turns the keyboard player on for this room, or off with null. */
export function setKeyboardRoom(room: string | null): void {
  useKeyboardUi.setState({ room, phone: null, cardHidden: false });
  try {
    if (room) sessionStorage.setItem(KEY, room);
    else sessionStorage.removeItem(KEY);
  } catch {
    // Without storage a reload just starts with it off.
  }
}
