import type { GameInfo } from "@/platform/games/game-api";
import { Cover } from "./Cover";
import icon from "./media/icon.jpg";
import poster from "./media/poster.jpg";

export const info: GameInfo = {
  id: "cube-game",
  title: "Cube Game",
  tagline: "Jump for real to jump the cube. Five levels of rhythm and spikes.",
  status: "ready",
  players: [1, 2],
  color: "#a855f7",
  input: "camera",
  Cover,
  media: { icon, poster, video: { webm: "/games/cube-game/backdrop.webm", mp4: "/games/cube-game/backdrop.mp4" } },
};
