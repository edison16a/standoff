import { BUTTONS, phoneStateSchema, type PhoneState } from "./protocol";

/** The keyboard's own buttons. `big` is the phone's big button: Shoot/Pass, or Guard while defending. */
export type KeyButton = "big" | "guard" | "slide" | "steal" | "jump";
export type PadName = (typeof BUTTONS)[keyof typeof BUTTONS];

/** Which buttons the phone shows, as in PadButtons: skipping a replay, a set piece, defending or attacking. */
export type PadMode = "attack" | "defend" | "setpiece" | "replay";

/** The host's latest state for this phone, or null before it has one. */
export function readState(payload: unknown): PhoneState | null {
  const parsed = phoneStateSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

/** True while the phone shows its controller, the only time it streams the pad. */
export function onPad(state: PhoneState | null): state is PhoneState {
  return !!state && state.playing && state.phase !== "lobby" && state.phase !== "fulltime";
}

export function padMode(state: PhoneState): PadMode {
  if (state.skip) return "replay";
  if (state.setPiece) return "setpiece";
  return state.defending ? "defend" : "attack";
}

/**
 * The pad button a key presses right now, or null where the phone shows
 * that button disabled or not at all. Mirrors PadButtons exactly, so a
 * key never does what a thumb on the phone could not.
 */
export function padButtonFor(key: KeyButton, state: PhoneState | null): PadName | null {
  if (!onPad(state)) return null;
  const mode = padMode(state);
  const live = state.phase === "play";
  if (mode === "replay") return key === "big" && !state.skip?.agreed ? BUTTONS.shoot : null;
  if (mode === "setpiece") {
    const sp = state.setPiece!;
    const taking = sp.part === "taker" && state.phase === "setpiece" && sp.stage !== "struck";
    return key === "big" && taking ? BUTTONS.shoot : null;
  }
  if (!live) return null;
  if (key === "slide") return BUTTONS.slide;
  if (key === "steal") return state.hasBall ? null : BUTTONS.steal;
  if (mode === "defend") return key === "big" || key === "guard" ? BUTTONS.guard : key === "jump" ? BUTTONS.jump : null;
  return key === "big" ? BUTTONS.shoot : null;
}
