import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";

export const info: GameInfo = {
  id: "nba-3v3",
  title: "NBA 3v3",
  tagline: "Three on three street basketball with the stars. Green your shots, first to 11.",
  status: "ready",
  players: [1, 2, 3, 4, 5, 6],
  color: "#6366f1",
  Cover,
};
