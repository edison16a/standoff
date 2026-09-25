import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";
import icon from "./media/icon.jpg";
import poster from "./media/poster.jpg";

export const info: GameInfo = {
  id: "nba-3v3",
  title: "NBA 3v3",
  tagline: "Three on three arena basketball with the stars. Green your shots, first to 11.",
  status: "ready",
  players: [1, 2, 3, 4, 5, 6],
  color: "#6366f1",
  Cover,
  media: { icon, poster, video: { webm: "/games/nba-3v3/backdrop.webm", mp4: "/games/nba-3v3/backdrop.mp4" } },
};
