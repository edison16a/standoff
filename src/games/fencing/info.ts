import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";
import icon from "./media/icon.jpg";
import poster from "./media/poster.jpg";

export const info: GameInfo = {
  id: "fencing",
  title: "Fencing",
  tagline: "Your phone is the sword. Flick to jab, raise up and right to parry.",
  status: "ready",
  players: [2],
  color: "#ff4757",
  Cover,
  media: { icon, poster, video: { webm: "/games/fencing/backdrop.webm", mp4: "/games/fencing/backdrop.mp4" } },
};
