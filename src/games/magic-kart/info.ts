import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";

export const info: GameInfo = {
  id: "magic-kart",
  title: "Magic Kart",
  tagline: "Race along the beach, grab power up cubes, first over the line wins.",
  status: "development",
  players: [1, 2, 4],
  color: "#1a9bdc",
  Cover,
};
