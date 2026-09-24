import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";

export const info: GameInfo = {
  id: "fencing",
  title: "Fencing",
  tagline: "Your phone is the sword. Chop to jab, lift to parry.",
  status: "ready",
  players: [2],
  Cover,
};
