/** How much the arena asks of the graphics card. */
export interface Quality {
  antialias: boolean;
  /** Bloom and the vignette. */
  post: boolean;
  shadows: boolean;
  shadowSize: number;
  crowd: boolean;
  maxPixelRatio: number;
}

export const HIGH: Quality = { antialias: true, post: true, shadows: true, shadowSize: 2048, crowd: true, maxPixelRatio: 1.5 };
/** For software rendering in tests: small shadows, a lower resolution, the same arena. */
export const LOW: Quality = { antialias: false, post: false, shadows: true, shadowSize: 512, crowd: true, maxPixelRatio: 0.75 };

/**
 * The home screen clip. The capture tool renders it frame by frame in
 * software, so it keeps the bloom and shadows but skips multisampling and
 * draws fewer pixels. Compressed video hides both.
 */
export const CLIP: Quality = { antialias: false, post: true, shadows: true, shadowSize: 1024, crowd: true, maxPixelRatio: 0.8 };

/** Just enough to follow a bout: no shadows, no crowd, a quarter of the pixels. */
export const MINIMAL: Quality = { antialias: false, post: false, shadows: false, shadowSize: 256, crowd: false, maxPixelRatio: 0.5 };

/** `?fq=low` or `?fq=min` on the host's address draws the arena cheaply, for browser tests on software rendering. */
export function readQuality(): Quality {
  if (typeof window === "undefined") return HIGH;
  const asked = new URLSearchParams(window.location.search).get("fq");
  return asked === "low" ? LOW : asked === "min" ? MINIMAL : HIGH;
}
