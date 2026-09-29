/**
 * The engine's surface for the host, the renderer and the phones. The
 * host owns a MatchState, feeds it commands every fixed step, reads its
 * events, draws `viewOf(state)`, and tells each phone `seatControls`.
 */
import type { MatchState } from "./types";

export { createMatch, stepMatch, endReplay, DEFAULT_OPTIONS, type Entrant } from "./match";
export { buildLineup } from "./lineup";
export { viewOf, type MatchView, type AthleteView, type LinemanView, type BallView, type KickView } from "./view";
export { seatControls, type ControlMode, type SeatControls } from "./controls";
export { adminTouchdown, adminFieldGoal, adminTwoPoint } from "./admin";
export { PlayTape, type ThrowFacts, type TapeMarks } from "./tape";
export { aimMeter, powerMeter, inGreen } from "./meters";
export { FIELD, spotLabel, yardNumber, goalLineOf } from "./field";
export { downLabel } from "./downs";
export { POINTS } from "./score";
export { STEP, KICK, MATCH } from "./tuning";
export type { MatchEvent, MatchEventType } from "./events";
export type * from "./types";

/** A phone dropped or came back: a computer plays that seat's athlete while it is away. */
export function setOnline(state: MatchState, seat: number, online: boolean): void {
  for (const a of state.athletes) if (a.seat === seat) a.online = online;
}
