import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";

export const info: GameInfo = {
  id: "zombie-survival",
  title: "Zombie Survival",
  tagline: "Point your phone to aim. Fight through the horde together.",
  status: "ready",
  players: [1, 2, 4],
  color: "#3fae5a",
  Cover,
};
