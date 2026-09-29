import type { PlayCall } from "./types";

/**
 * One play from the line up to the whistle. The drive says where it
 * started; this says what has happened since the snap.
 */
export interface Play {
  call: PlayCall;
  /** Seconds since the snap, or null before it. */
  sinceSnap: number | null;
  /** Defenders may cross the line once the ball is snapped. */
  rushOn: boolean;
  /** A forward pass has left the QB's hand; there is only one per play. */
  passed: boolean;
  /** The QB ran past the line and can no longer throw. */
  crossed: boolean;
  caughtBy: number | null;
  intercepted: boolean;
  /** The receiver the throw stick picks right now, whose ring lights up. */
  target: number | null;
  /** On a run call, the runner lined up beside the QB for the pitch. */
  back: number | null;
  /** The pitch has left the QB's hand; there is one a play. */
  pitched: boolean;
  /** Match time the play went live, for replays. */
  startedAt: number;
  over: boolean;
}

export function newPlay(call: PlayCall, time: number, back: number | null = null): Play {
  return {
    call, sinceSnap: null, rushOn: false, passed: false, crossed: false,
    caughtBy: null, intercepted: false, target: null, back, pitched: false, startedAt: time, over: false,
  };
}
