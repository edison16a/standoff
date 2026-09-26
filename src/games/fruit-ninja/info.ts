import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";
import icon from "./media/icon.jpg";
import poster from "./media/poster.jpg";

export const info: GameInfo = {
  id: "fruit-ninja",
  title: "Fruit Slicer",
  tagline: "Slice the fruit, dodge the bombs. Top score when time runs out wins.",
  status: "ready",
  players: [1, 2, 4],
  color: "#c47a3a",
  Cover,
  media: { icon, poster, video: { webm: "/games/fruit-ninja/backdrop.webm", mp4: "/games/fruit-ninja/backdrop.mp4" } },
};
