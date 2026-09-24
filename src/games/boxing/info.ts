import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";

export const info: GameInfo = {
  id: "boxing",
  title: "Boxing",
  tagline: "Your body is the controller. Punch, block and duck in front of the camera.",
  status: "development",
  players: [1, 2],
  color: "#f97316",
  input: "camera",
  Cover,
};
