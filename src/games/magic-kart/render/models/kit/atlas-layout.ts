import type { CharacterId } from "../../../characters";

/**
 * Where each picture sits on the one texture every kart shares: tyre
 * treads and sidewall lettering, each kart's emblem and number plate,
 * lamps, carbon weave and seat quilting. Plain parts point at the white
 * square, so the texture changes nothing on them. Kept free of the DOM so
 * the models build in tests; `atlas.ts` draws it.
 */
export const ATLAS_SIZE = 1024;

export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

const r = (x: number, y: number, w: number, h: number): Region => ({ x, y, w, h });

export const REGIONS = {
  white: r(0, 0, 64, 64),
  eye: r(64, 0, 64, 64),
  lamp: r(128, 0, 128, 128),
  tail: r(256, 0, 128, 128),
  grille: r(384, 0, 128, 128),
  quilt: r(512, 0, 128, 128),
  carbon: r(640, 0, 128, 128),
  vent: r(768, 0, 128, 128),
  bolt: r(896, 0, 64, 64),
  flame: r(384, 128, 256, 128),
  stickerGrip: r(640, 128, 256, 64),
  stickerNitro: r(640, 192, 256, 64),
  stripe: r(896, 64, 128, 192),
  treadRace: r(0, 128, 128, 256),
  treadKnobby: r(128, 128, 128, 256),
  treadRib: r(256, 128, 128, 256),
} as const;

export type RegionName = keyof typeof REGIONS;

/** The kart order every per kart strip of the atlas follows. */
const ORDER: readonly CharacterId[] = ["blaze", "pip", "nova", "mochi"];

/** A sidewall ring with lettering, one style per kart. */
export const sidewallRegion = (id: CharacterId): Region => r(ORDER.indexOf(id) * 256, 384, 256, 256);
/** The kart's own badge. */
export const emblemRegion = (id: CharacterId): Region => r(ORDER.indexOf(id) * 256, 640, 256, 256);
/** The race number plate. */
export const plateRegion = (id: CharacterId): Region => r(ORDER.indexOf(id) * 256, 896, 256, 128);

/** A small inset keeps mipmaps from bleeding the next picture in. */
const INSET = 3;

/**
 * Atlas coordinates for a point (u, v) in 0..1 of a region, v up. The
 * texture is flipped on upload, so canvas rows count down from the top.
 */
export function atlasUv(region: Region, u: number, v: number): [number, number] {
  const x = region.x + INSET + u * (region.w - INSET * 2);
  const y = region.y + INSET + (1 - v) * (region.h - INSET * 2);
  return [x / ATLAS_SIZE, 1 - y / ATLAS_SIZE];
}

/** The middle of the white square, for parts that show only their own colour. */
export const WHITE_UV = atlasUv(REGIONS.white, 0.5, 0.5);
