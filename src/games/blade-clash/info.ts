import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";
import icon from "./media/icon.jpg";
import poster from "./media/poster.jpg";

export const info: GameInfo = {
  id: "blade-clash",
  title: "Blade Clash",
  tagline: "Your phone is the sword. Swing it, block and clash in a split screen duel.",
  status: "ready",
  players: [2],
  color: "#ff8a1f",
  Cover,
  media: { icon, poster, video: { webm: "/games/blade-clash/backdrop.webm", mp4: "/games/blade-clash/backdrop.mp4" } },
};
