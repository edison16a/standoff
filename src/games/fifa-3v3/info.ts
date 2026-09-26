import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";
import icon from "./media/icon.jpg";
import poster from "./media/poster.jpg";

export const info: GameInfo = {
  id: "fifa-3v3",
  title: "Soccer 3v3",
  tagline: "Three on three football with the stars and a keeper in each goal. Slide in and shoot.",
  status: "ready",
  players: [1, 2, 3, 4, 5, 6],
  color: "#14b8a6",
  Cover,
  media: { icon, poster, video: { webm: "/games/fifa-3v3/backdrop.webm", mp4: "/games/fifa-3v3/backdrop.mp4" } },
};
