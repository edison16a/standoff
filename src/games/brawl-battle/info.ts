import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";
import icon from "./media/icon.jpg";
import poster from "./media/poster.jpg";

export const info: GameInfo = {
  id: "brawl-battle",
  title: "Brawl Battle",
  tagline: "Four fighters on floating stages. Pile on the damage, then knock everyone off the edge.",
  status: "ready",
  players: [1, 2, 3, 4],
  color: "#ff6b35",
  Cover,
  media: { icon, poster, video: { webm: "/games/brawl-battle/backdrop.webm", mp4: "/games/brawl-battle/backdrop.mp4" } },
};
