import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";
import icon from "./media/icon.jpg";
import poster from "./media/poster.jpg";

export const info: GameInfo = {
  id: "counter-battle",
  title: "Counter Battle",
  tagline: "Your phone is the gun. Your fighter runs the bunkers. First team to five rounds wins.",
  status: "ready",
  players: [1, 2, 3, 4],
  color: "#b8f400",
  Cover,
  media: { icon, poster, video: { webm: "/games/counter-battle/backdrop.webm", mp4: "/games/counter-battle/backdrop.mp4" } },
};
