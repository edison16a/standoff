import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";

export const info: GameInfo = {
  id: "fruit-ninja",
  title: "Fruit Ninja",
  tagline: "Slice the fruit, dodge the bombs. Top score when time runs out wins.",
  status: "ready",
  players: [1, 2, 4],
  color: "#c47a3a",
  Cover,
};
