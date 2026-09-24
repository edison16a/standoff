import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";

export const info: GameInfo = {
  id: "subway-surfers",
  title: "Subway Surfers",
  tagline: "Run the rails with your whole body. Jump, duck and dodge for a high score.",
  status: "ready",
  players: [1, 2],
  color: "#eab308",
  input: "camera",
  Cover,
};
