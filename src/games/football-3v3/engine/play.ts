import type { PlayDesign } from "./playbook/deal";
import type { Runout } from "./score-runout";
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
  /** The QB pressed Run or crossed the line: a runner for the rest of the play, with no throw and no pitch. */
  qbRun: boolean;
  caughtBy: number | null;
  intercepted: boolean;
  /** The receiver the throw stick picks right now, whose ring lights up. */
  target: number | null;
  /** The throw button the QB's finger rests on, by slot, whose runner lights up on the big screen (throw-highlight.ts). */
  hot: number | null;
  /** On a run call, the runner lined up beside the QB for the pitch. */
  back: number | null;
  /** The pitch has left the QB's hand; there is one a play. */
  pitched: boolean;
  /** The play picked from the playbook, or null for a kick or a game played as it was filmed. */
  design: PlayDesign | null;
  /** The four runners the design draws, left to right, by id (playbook/runners.ts). */
  runners: number[];
  /** Match time the play went live, for replays. */
  startedAt: number;
  over: boolean;
  /** The scorer pulling up after a touchdown, then celebrating (score-runout.ts). */
  runout: Runout | null;
}

export function newPlay(call: PlayCall, time: number, back: number | null = null, design: PlayDesign | null = null, runners: number[] = []): Play {
  return {
    call, sinceSnap: null, rushOn: false, passed: false, qbRun: false,
    caughtBy: null, intercepted: false, target: null, hot: null, back, pitched: false, design, runners, startedAt: time, over: false, runout: null,
  };
}
