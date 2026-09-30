import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";
import icon from "./media/icon.jpg";
import poster from "./media/poster.jpg";

export const info: GameInfo = {
  id: "football-3v3",
  title: "Football 3v3",
  tagline: "Three on three American football under the lights. Call the play, hike it and throw a spiral.",
  status: "ready",
  players: [2, 3, 4, 5, 6],
  color: "#f5c518",
  Cover,
  media: { icon, poster, video: { webm: "/games/football-3v3/backdrop.webm", mp4: "/games/football-3v3/backdrop.mp4" } },
};
