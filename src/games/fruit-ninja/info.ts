import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";

export const info: GameInfo = {
  id: "fruit-ninja",
  title: "Fruit Ninja",
  tagline: "Slice the fruit, dodge the bombs. Top score when time runs out wins.",
  status: "development",
  players: [1, 2, 4],
  Cover,
};
