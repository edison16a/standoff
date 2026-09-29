/**
 * How a footballer looks: their kit and their body. Looks are built from
 * build, skin tone, hair, kit and number, never from photos.
 */

export type HairStyle = "swept" | "slick" | "buzz" | "bun" | "twists" | "curls" | "parted" | "afro" | "messy" | "curlytop";
export type Beard = "none" | "stubble" | "full";
/** A goal celebration: the SUI (run, leap, half turn, land) or a knee slide across the grass. */
export type Celebration = "sui" | "kneeslide";

export interface Kit {
  shirt: string;
  /** Vertical stripes over the shirt colour, like a striped shirt. */
  stripes?: string;
  trim: string;
  shorts: string;
  socks: string;
  /** The colour the name and number are printed in. */
  ink: string;
}

export interface Look {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  beard: Beard;
  /** Standing height in metres, which scales the whole body. */
  height: number;
  /** 0 slight to 1 powerful: shoulders, chest and thighs. */
  build: number;
  boots: string;
  /** Goalkeeper gloves on an outfield player, for the Sweeper Keeper. */
  gloves?: boolean;
  /** The kit they are shown in on the phone's picker. Matches are played in team kits. */
  kit: Kit;
}

export const kit = (shirt: string, trim: string, shorts: string, socks: string, ink: string, stripes?: string): Kit => ({ shirt, trim, shorts, socks, ink, stripes });
