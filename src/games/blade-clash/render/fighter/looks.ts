import type { CharacterId } from "@/games/blade-clash/characters";

/** How a fighter's placeholder body and blade are coloured. */
export interface Look {
  body: number;
  /** Helmet or head. */
  head: number;
  /** Boxes for the Block Hero, rounded shapes for everyone else. */
  blocky: boolean;
  blade: number;
  /** The Star Knight's blade gives its own light. */
  glowing: boolean;
  hilt: number;
}

export const LOOKS: Record<CharacterId, Look> = {
  knight: { body: 0xaab4c8, head: 0x8d97ab, blocky: false, blade: 0xdfe6f2, glowing: false, hilt: 0xc9a24a },
  samurai: { body: 0x2a2a33, head: 0x1d1d24, blocky: false, blade: 0xeef0f4, glowing: false, hilt: 0x2a2a2a },
  block: { body: 0x4a8bd6, head: 0xff9a3c, blocky: true, blade: 0xff5fd2, glowing: false, hilt: 0xffc83d },
  star: { body: 0xe9edf5, head: 0xe9edf5, blocky: false, blade: 0xffffff, glowing: true, hilt: 0xb8c2d6 },
};
