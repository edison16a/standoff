import type { PhoneState } from "../protocol";

type Pad = PhoneState["pad"];

/** The pads that keep the move stick under the left thumb. */
const STICK_PADS: ReadonlySet<Pad> = new Set<Pad>(["qb", "runner", "defense"]);

/** Whether this pad has the move stick on the left. */
export function hasMoveStick(pad: Pad): boolean {
  return STICK_PADS.has(pad);
}

/**
 * Which set of buttons is on screen. A change lets go of anything held.
 * Skip coming and going counts too: a vote pressed as the replay ends
 * must not stay held into the next one. The snap only changes the QB's
 * buttons; a defender's stick stays held through the call and the snap.
 */
export function layoutKey(host: Pick<PhoneState, "pad" | "phase" | "skip">): string {
  return `${host.pad}:${host.pad === "qb" && host.phase === "presnap"}:${host.skip !== null}`;
}
