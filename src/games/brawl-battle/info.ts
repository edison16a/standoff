import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";

export const info: GameInfo = {
  id: "brawl-battle",
  title: "Brawl Battle",
  tagline: "Four fighters on floating stages. Pile on the damage, then knock everyone off the edge.",
  status: "development",
  players: [1, 2, 3, 4],
  color: "#ff6b35",
  Cover,
};
