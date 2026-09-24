import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";
import icon from "./media/icon.jpg";
import poster from "./media/poster.jpg";

export const info: GameInfo = {
  id: "magic-kart",
  title: "Magic Kart",
  tagline: "Race along the beach, grab power up cubes, first over the line wins.",
  status: "ready",
  players: [1, 2, 4],
  color: "#1a9bdc",
  Cover,
  media: { icon, poster, video: { webm: "/games/magic-kart/backdrop.webm", mp4: "/games/magic-kart/backdrop.mp4" } },
};
