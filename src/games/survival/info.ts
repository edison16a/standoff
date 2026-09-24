import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";

export const info: GameInfo = {
  id: "survival",
  title: "Co-op Survival",
  tagline: "Back to back, aim with your phone. Top score wins.",
  status: "development",
  players: [1, 2],
  Cover,
};
