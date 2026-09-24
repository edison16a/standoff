import { BEACH } from "./beach";
import { CITY } from "./city";
import { SPACE } from "./space";
import type { TrackDef } from "./types";
import { VOLCANO } from "./volcano";

/** Every map, in the order the map picker shows them. */
export const TRACKS: readonly TrackDef[] = [BEACH, SPACE, CITY, VOLCANO];
export const TRACK_IDS = ["beach", "space", "city", "volcano"] as const;
export type TrackId = (typeof TRACK_IDS)[number];

export function findTrack(id: string): TrackDef {
  return TRACKS.find((track) => track.id === id) ?? BEACH;
}
