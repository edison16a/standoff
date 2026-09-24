import type { ItemKind } from "./items";

/**
 * Things that happen in a race, in the order they happened. The renderer
 * turns them into sparks and flashes, the sound director into sound and
 * the host into buzzes on the phones, all from the same list.
 */
export type RaceEvent =
  | { type: "countdown"; count: number }
  | { type: "go" }
  | { type: "pickup"; kart: number; item: ItemKind }
  | { type: "use"; kart: number; item: ItemKind }
  | { type: "hit"; kart: number; by: "orb" | "ice" | "obstacle"; from: number | null }
  | { type: "blocked"; kart: number }
  | { type: "boost"; kart: number; source: "nitro" | "pad" | "drift" | "start" }
  | { type: "drift"; kart: number; on: boolean }
  | { type: "bump"; kart: number; strength: number }
  | { type: "jump"; kart: number }
  | { type: "land"; kart: number; airTime: number }
  | { type: "lap"; kart: number; lap: number }
  | { type: "finalLap"; kart: number }
  | { type: "finish"; kart: number; place: number }
  | { type: "fell"; kart: number }
  | { type: "respawn"; kart: number }
  | { type: "raceOver" };

export type Emit = (event: RaceEvent) => void;
