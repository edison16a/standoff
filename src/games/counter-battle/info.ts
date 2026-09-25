import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";

export const info: GameInfo = {
  id: "counter-battle",
  title: "Counter Battle",
  tagline: "Your phone is the gun. Your fighter runs the bunkers. First team to five rounds wins.",
  status: "development",
  players: [1, 2, 3, 4],
  color: "#b8f400",
  Cover,
};
