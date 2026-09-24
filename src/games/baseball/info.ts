import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";

export const info: GameInfo = {
  id: "baseball",
  title: "Baseball Pitch",
  tagline: "One pitches, one swings. Real arm, real bat.",
  status: "development",
  players: [2],
  Cover,
};
