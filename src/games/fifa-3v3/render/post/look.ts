/**
 * The grade of the picture on its way to the screen. Live play has the
 * clean, slightly cool look of a night match on television; the replay
 * goes a touch harder with the stands thrown out of focus; the ceremony
 * is warm and glowing, and the lobby sits between.
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
  /** A green push in the mid tones, as a broadcast grade gives the grass. */
  grass: number;
  /** Depth of field, 0 off to 1 full. */
  dof: number;
}

export const BROADCAST_LOOK: Readonly<Look> = { exposure: 1, bloom: 0.09, vignette: 0.14, saturation: 1.06, contrast: 0.14, warmth: -0.02, grass: 0.04, dof: 0 };
export const REPLAY_LOOK: Readonly<Look> = { exposure: 1, bloom: 0.12, vignette: 0.3, saturation: 1.0, contrast: 0.22, warmth: -0.06, grass: 0.02, dof: 1 };
export const CEREMONY_LOOK: Readonly<Look> = { exposure: 0.95, bloom: 0.18, vignette: 0.28, saturation: 1.1, contrast: 0.16, warmth: 0.12, grass: 0, dof: 0.8 };
export const LOBBY_LOOK: Readonly<Look> = { exposure: 0.95, bloom: 0.14, vignette: 0.24, saturation: 1.04, contrast: 0.16, warmth: 0.02, grass: 0.02, dof: 0 };

const KEYS = ["exposure", "bloom", "vignette", "saturation", "contrast", "warmth", "grass", "dof"] as const;

/** Which look a shot wants: replays and the ceremony have their own, the rest is the broadcast's. */
export function lookFor(shot: string): Readonly<Look> {
  if (shot === "replay-kicker" || shot === "replay-keeper") return REPLAY_LOOK;
  if (shot === "ceremony" || shot === "winners") return CEREMONY_LOOK;
  if (shot === "lobby") return LOBBY_LOOK;
  return BROADCAST_LOOK;
}

/** Eases `out` toward `to` with a time constant of 1/`rate` seconds, so a cut to the replay grades in over a few frames. */
export function easeLook(out: Look, to: Readonly<Look>, dt: number, rate: number): Look {
  const k = 1 - Math.exp(-rate * Math.max(0, dt));
  for (const key of KEYS) out[key] += (to[key] - out[key]) * k;
  return out;
}

/** The white balance as red, green and blue gains, keeping the brightness about the same. */
export function balance(warmth: number): [number, number, number] {
  const w = Math.max(-1, Math.min(1, warmth));
  return [1 + 0.1 * w, 1 + 0.01 * w, 1 - 0.12 * w];
}
