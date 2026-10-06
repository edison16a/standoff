import type { Payload, Seat } from "@/platform/protocol";

/**
 * Keyboard play, for testing a game on one computer. The admin panel's
 * Keyboard player seats a virtual phone, shows the game's own phone screen
 * in a small panel, and turns keys and the mouse into the messages that
 * phone would send. A game opts in with `keyboard` on its GameModule.
 * See src/platform/keyboard/README.md.
 */

/**
 * One key cap, such as "W" or "Space", or caps pressed as one control,
 * such as ["W", "A", "S", "D"]. Mouse buttons are caps too: "Left click".
 */
export type KeyCaps = string | readonly string[];

/** One line of the controls card: what it does and the keys that do it. */
export interface ControlRow {
  /** Short, such as "Move" or "Shoot". */
  action: string;
  /** Each entry is another way to do it, shown with "or" between. */
  keys: readonly KeyCaps[];
}

/** A titled block of rows, such as "Match" or "Menus". */
export interface ControlGroup {
  title: string;
  rows: readonly ControlRow[];
}

/** The mouse over the big screen, in the aim kit's space: x and y from -1 to 1, y up. */
export interface StagePointer {
  type: "move" | "down" | "up";
  x: number;
  y: number;
  /** 0 left, 1 middle, 2 right. Zero on a move. */
  button: number;
}

/** What a binding gets to work with, for one keyboard seat. */
export interface KeyboardContext {
  readonly seat: Seat;
  /** Sends as this seat's phone, reliably. */
  send(payload: Payload): void;
  /** Sends as this seat's phone, dropped if the link is behind. For streams. */
  sendLossy(payload: Payload): void;
  /**
   * The newest message the host sent this phone, of this kind, or of any
   * kind without one. Tells a binding where the phone is, lobby or match.
   */
  last(kind?: string): Payload | null;
}

/** One seat's live controller. Every method is optional. */
export interface KeyboardPlayer {
  /**
   * A key went down or up, by `event.code` ("KeyW", "Space", "ArrowLeft").
   * Held keys never repeat here. Return true when the key was used.
   */
  key?(code: string, down: boolean): boolean | void;
  /** The mouse over the big screen, for aiming games. */
  pointer?(event: StagePointer): void;
  /** About 30 times a second while the keyboard player is on, for streams like a stick. */
  tick?(): void;
  /** Every key was let go at once: the window lost focus. Reset holds here. */
  release?(): void;
  dispose?(): void;
}

/** What a game exports as `keyboard` on its GameModule. */
export interface KeyboardBinding {
  /** The rows for the controls card. */
  controls: readonly ControlGroup[];
  /**
   * Message kinds the keyboard sends in place of the phone screen, such as
   * a stick stream. The phone panel's own messages of these kinds are
   * dropped, so a resting on screen stick never fights the keys.
   */
  replaces?: readonly string[];
  /**
   * The card's last line, on where the menus are. A camera game, whose
   * menus are on the big screen, says so here. Unset, it says to click
   * the phone panel.
   */
  foot?: string;
  create(ctx: KeyboardContext): KeyboardPlayer;
}
