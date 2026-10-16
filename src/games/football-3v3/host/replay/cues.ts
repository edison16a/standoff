import type { MatchEvent } from "../../engine/events";

/** A sound of the play, at the match time it happened. */
export interface Cue {
  time: number;
  event: MatchEvent;
}

/**
 * The sounds a replay plays again: only the key moments, the snap, the
 * throw, the pitch and the catch, with a cut or two. The stream of pads,
 * hits and bodies on the turf is left out: heard again under the replay
 * it was a clatter that buried the play. Never the whistle, the horn or
 * the score's music, which belong to the live moment, and nothing a
 * phone or the board reacts to.
 */
const REPLAYED = new Set<MatchEvent["type"]>(["hike", "juke", "throw", "pitch", "takePitch", "catch"]);

export const replays = (event: MatchEvent): boolean => REPLAYED.has(event.type);

/** The cues after `from` up to and including `to`, oldest first. */
export function cuesBetween(cues: readonly Cue[], from: number, to: number): MatchEvent[] {
  return cues.filter((c) => c.time > from && c.time <= to).map((c) => c.event);
}
