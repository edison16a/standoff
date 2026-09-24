import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";

export const info: GameInfo = {
  id: "fifa-3v3",
  title: "FIFA 3v3",
  tagline: "Three on three football with the stars and a keeper in each goal. Slide in and shoot.",
  status: "development",
  players: [1, 2, 3, 4, 5, 6],
  color: "#14b8a6",
  Cover,
};
