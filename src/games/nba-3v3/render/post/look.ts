/**
 * The grade of the picture: how it is exposed and coloured on its way
 * to the screen. Live play has the broadcast's clean, punchy look; the
 * replay goes a touch cooler and harder with the background thrown out
 * of focus; the ceremony is warm and glowing.
 */
export interface Look {
  /** Multiplies the light before the filmic curve. */
  exposure: number;
  /** How much of the glow round bright light is added. */
  bloom: number;
  /** Darkening toward the corners, 0 none. */
  vignette: number;
  /** 1 leaves colour alone, more is richer. */
  saturation: number;
  /** Blend toward an S curve, 0 none. */
  contrast: number;
  /** White balance: below 0 cooler, above 0 warmer. */
  warmth: number;
  /** How far the blacks are lifted, as a share of white. */
  lift: number;
  /** Depth of field, 0 off to 1 full. */
  dof: number;
}

export const BROADCAST_LOOK: Readonly<Look> = { exposure: 1.0, bloom: 0.1, vignette: 0.16, saturation: 1.08, contrast: 0.16, warmth: 0.05, lift: 0.008, dof: 0 };
export const REPLAY_LOOK: Readonly<Look> = { exposure: 1.0, bloom: 0.13, vignette: 0.3, saturation: 1.02, contrast: 0.24, warmth: -0.06, lift: 0.012, dof: 1 };
export const CEREMONY_LOOK: Readonly<Look> = { exposure: 0.86, bloom: 0.2, vignette: 0.28, saturation: 1.1, contrast: 0.18, warmth: 0.12, lift: 0.01, dof: 0.85 };

const KEYS = ["exposure", "bloom", "vignette", "saturation", "contrast", "warmth", "lift", "dof"] as const;

/** Eases `out` toward `to` with a time constant of 1/`rate` seconds, so a cut to the replay grades in over a few frames. */
export function easeLook(out: Look, to: Readonly<Look>, dt: number, rate: number): Look {
  const k = 1 - Math.exp(-rate * Math.max(0, dt));
  for (const key of KEYS) out[key] += (to[key] - out[key]) * k;
  return out;
}

/** The white balance as red, green and blue gains, keeping brightness about the same. */
export function balance(warmth: number): [number, number, number] {
  const w = Math.max(-1, Math.min(1, warmth));
  return [1 + 0.1 * w, 1 + 0.01 * w, 1 - 0.12 * w];
}
