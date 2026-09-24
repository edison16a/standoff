/**
 * The looks a player can give their BB gun on the phone. Plain data, so
 * the protocol can check a pick without loading three.js.
 */

export const FINISH_IDS = ["walnut", "cherry", "midnight", "birch", "forest", "gold"] as const;
export type FinishId = (typeof FINISH_IDS)[number];

export interface Finish {
  id: FinishId;
  name: string;
  /** The stock and pump grip. `grain` draws wood grain over the colour. */
  stock: { color: string; grain: boolean; roughness: number };
  /** Barrel, receiver and sights. */
  metal: { color: string; metalness: number; roughness: number };
  /** Bands, screws and the badge on the receiver. */
  trim: string;
}

export const FINISHES: Record<FinishId, Finish> = {
  walnut: {
    id: "walnut",
    name: "Walnut",
    stock: { color: "#7a4122", grain: true, roughness: 0.55 },
    metal: { color: "#2c3340", metalness: 0.85, roughness: 0.32 },
    trim: "#c9a24a",
  },
  cherry: {
    id: "cherry",
    name: "Cherry",
    stock: { color: "#c0142f", grain: false, roughness: 0.3 },
    metal: { color: "#d7dbe0", metalness: 0.95, roughness: 0.18 },
    trim: "#f4f4f4",
  },
  midnight: {
    id: "midnight",
    name: "Midnight",
    stock: { color: "#23263a", grain: false, roughness: 0.75 },
    metal: { color: "#3e4556", metalness: 0.8, roughness: 0.45 },
    trim: "#8fa0c8",
  },
  birch: {
    id: "birch",
    name: "Birch",
    stock: { color: "#d8b47a", grain: true, roughness: 0.6 },
    metal: { color: "#b58b35", metalness: 0.9, roughness: 0.3 },
    trim: "#6b4a1e",
  },
  // A deep green lacquer, like an old club rifle, with brass fittings.
  forest: {
    id: "forest",
    name: "Forest",
    stock: { color: "#1d5438", grain: false, roughness: 0.32 },
    metal: { color: "#262a30", metalness: 0.85, roughness: 0.3 },
    trim: "#d4a64a",
  },
  gold: {
    id: "gold",
    name: "Showman",
    stock: { color: "#40200f", grain: true, roughness: 0.45 },
    metal: { color: "#e0ac2c", metalness: 1, roughness: 0.22 },
    trim: "#fff0b3",
  },
};

export const DEFAULT_FINISH: FinishId = "walnut";
