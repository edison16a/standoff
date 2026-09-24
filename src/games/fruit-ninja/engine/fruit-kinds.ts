/**
 * Every kind of thing that flies up. The engine needs only size, value
 * and rarity. How each one looks lives in render/models.
 */

export const FRUIT_IDS = [
  "watermelon",
  "orange",
  "apple",
  "green-apple",
  "banana",
  "pineapple",
  "kiwi",
  "coconut",
  "strawberry",
  "lemon",
  "lime",
  "plum",
  "peach",
  "giant-melon",
  "pomegranate",
  "star-fruit",
  "dragonfruit",
] as const;

export type FruitId = (typeof FRUIT_IDS)[number];
export type BodyKind = FruitId | "bomb";

/** Common fruit is cut once, big fruit takes several hits, rare fruit glows and pays well. */
export type FruitClass = "common" | "big" | "rare";

export interface KindInfo {
  /** Hit radius in world units. The model is drawn to match. */
  radius: number;
  /** Points for a clean slice. Big fruit score per hit instead, see POINTS. */
  points: number;
  class: FruitClass;
  /** Cuts it takes to finish. Only big fruit take more than one. */
  hits: number;
  /** How often it comes up among its class. */
  weight: number;
}

const common = (radius: number, points: number, weight = 1): KindInfo => ({ radius, points, class: "common", hits: 1, weight });

export const KINDS: Record<BodyKind, KindInfo> = {
  watermelon: common(1.1, 10, 1.2),
  orange: common(0.7, 10, 1.2),
  apple: common(0.68, 10, 1.1),
  "green-apple": common(0.66, 10, 0.8),
  banana: common(0.78, 10, 1),
  pineapple: common(0.8, 10, 0.8),
  kiwi: common(0.55, 15, 0.9),
  coconut: common(0.74, 10, 0.7),
  strawberry: common(0.56, 15, 1),
  lemon: common(0.6, 10, 0.9),
  lime: common(0.54, 15, 0.7),
  plum: common(0.56, 15, 0.8),
  peach: common(0.66, 10, 0.9),
  "giant-melon": { radius: 1.55, points: 0, class: "big", hits: 7, weight: 1 },
  pomegranate: { radius: 1.02, points: 0, class: "big", hits: 5, weight: 1 },
  "star-fruit": { radius: 0.7, points: 60, class: "rare", hits: 1, weight: 1 },
  dragonfruit: { radius: 0.78, points: 80, class: "rare", hits: 1, weight: 0.8 },
  bomb: { radius: 0.68, points: 0, class: "common", hits: 1, weight: 0 },
};

export const COMMON_FRUIT: readonly FruitId[] = FRUIT_IDS.filter((id) => KINDS[id].class === "common");
export const BIG_FRUIT: readonly FruitId[] = FRUIT_IDS.filter((id) => KINDS[id].class === "big");
export const RARE_FRUIT: readonly FruitId[] = FRUIT_IDS.filter((id) => KINDS[id].class === "rare");
