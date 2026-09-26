import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";
import icon from "./media/icon.jpg";
import poster from "./media/poster.jpg";

export const info: GameInfo = {
  id: "subway-surfers",
  title: "Subway Runner",
  tagline: "Run the neon rails from the waist up. Jump, roll and dodge for a high score.",
  status: "ready",
  players: [1, 2],
  color: "#ff2bd6",
  input: "camera",
  Cover,
  media: { icon, poster, video: { webm: "/games/subway-surfers/backdrop.webm", mp4: "/games/subway-surfers/backdrop.mp4" } },
};
