import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";
import icon from "./media/icon.jpg";
import poster from "./media/poster.jpg";

export const info: GameInfo = {
  id: "shooting-gallery",
  title: "Shooting Gallery",
  tagline: "Point your phone to aim. Ducks and targets, top score wins.",
  status: "ready",
  players: [1, 2, 4],
  color: "#e0368c",
  Cover,
  media: { icon, poster, video: { webm: "/games/shooting-gallery/backdrop.webm", mp4: "/games/shooting-gallery/backdrop.mp4" } },
};
