/**
 * How the picture is exposed and coloured on its way to the screen. Live
 * play has a night game broadcast's look: clean whites, rich turf and a
 * light vignette. The replay goes a touch cooler and harder with the
 * background thrown out of focus. The trophy ceremony is warm and glows.
 */
export interface Look {
  /** Multiplies the light before the filmic curve. */
  exposure: number;
  /** How much of the glow round bright light is added. */
  bloom: number;
  /** Darkening toward the corners, 0 for none. */
  vignette: number;
  /** 1 leaves colour alone, more is richer. */
  saturation: number;
  /** Blend toward an S curve, 0 for none. */
  contrast: number;
  /** White balance: below 0 cooler, above 0 warmer. */
  warmth: number;
  /** How far the blacks are lifted, as a share of white. */
  lift: number;
  /** Depth of field, 0 off to 1 full. */
  dof: number;
  /** A broadcast camera's edge crispening, 0 for none. */
  sharpen: number;
}

export const LIVE_LOOK: Readonly<Look> = { exposure: 1, bloom: 0.12, vignette: 0.14, saturation: 1.08, contrast: 0.14, warmth: 0.04, lift: 0.006, dof: 0, sharpen: 0.25 };
export const REPLAY_LOOK: Readonly<Look> = { exposure: 1, bloom: 0.15, vignette: 0.3, saturation: 1.02, contrast: 0.22, warmth: -0.06, lift: 0.01, dof: 1, sharpen: 0.15 };
export const CEREMONY_LOOK: Readonly<Look> = { exposure: 0.95, bloom: 0.22, vignette: 0.26, saturation: 1.1, contrast: 0.16, warmth: 0.12, lift: 0.01, dof: 0.8, sharpen: 0.1 };

const KEYS = ["exposure", "bloom", "vignette", "saturation", "contrast", "warmth", "lift", "dof", "sharpen"] as const;

/** Eases `out` toward `to` with a time constant of 1/`rate` seconds, so a cut to the replay grades in over a few frames. */
export function easeLook(out: Look, to: Readonly<Look>, dt: number, rate: number): Look {
  const k = 1 - Math.exp(-rate * Math.max(0, dt));
  for (const key of KEYS) out[key] += (to[key] - out[key]) * k;
  return out;
}

/** The white balance as red, green and blue gains that keep the brightness about the same. */
export function balance(warmth: number): [number, number, number] {
  const w = Math.max(-1, Math.min(1, warmth));
  return [1 + 0.1 * w, 1 + 0.01 * w, 1 - 0.12 * w];
}
