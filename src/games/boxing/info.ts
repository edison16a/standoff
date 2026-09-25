import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";
import icon from "./media/icon.jpg";
import poster from "./media/poster.jpg";

export const info: GameInfo = {
  id: "boxing",
  title: "Boxing",
  tagline: "Your body is the controller. Punch, block and duck in front of the camera.",
  status: "ready",
  players: [1, 2],
  color: "#f97316",
  input: "camera",
  Cover,
  media: { icon, poster, video: { webm: "/games/boxing/backdrop.webm", mp4: "/games/boxing/backdrop.mp4" } },
};
