/**
 * The surface finishes a kart is made of. Each part carries its finish in
 * its vertices (roughness, metalness, clear coat, glow), so one material
 * draws paint, chrome, rubber and lamps in a single pass, and a whole
 * kart body stays one draw call.
 */
export type Finish =
  | "paint"
  | "metallic"
  | "pearl"
  | "chrome"
  | "brushed"
  | "gunmetal"
  | "rubber"
  | "plastic"
  | "satin"
  | "carbon"
  | "leather"
  | "cloth"
  | "fur"
  | "skin"
  | "eye"
  | "glass"
  | "lamp"
  | "neon"
  | "heat"
  | "core"
  | "brake"
  | "head";

/**
 * Glow is packed into one number: the whole part is the channel times
 * 16, the rest is how bright. Channel 0 always glows; the others follow
 * a uniform the model drives each frame (exhaust heat, brake lights,
 * headlights).
 */
export const GLOW_CHANNEL = { always: 0, heat: 1, brake: 2, head: 3 } as const;
export type GlowChannel = keyof typeof GLOW_CHANNEL;

export const packGlow = (amount: number, channel: GlowChannel = "always") => GLOW_CHANNEL[channel] * 16 + Math.min(15.9, amount);

/** Roughness, metalness, clear coat and packed glow for each finish. */
export const FINISHES: Record<Finish, readonly [number, number, number, number]> = {
  // Solid colour under a thick clear coat: the glossy toy car look.
  paint: [0.42, 0, 1, 0],
  // Metal flake under clear coat, for candy and pearl paint jobs.
  metallic: [0.34, 0.55, 1, 0],
  pearl: [0.3, 0.22, 1, 0],
  chrome: [0.06, 1, 0, 0],
  brushed: [0.3, 1, 0, 0],
  gunmetal: [0.42, 0.85, 0.3, 0],
  rubber: [0.86, 0, 0, 0],
  plastic: [0.5, 0, 0.25, 0],
  satin: [0.62, 0.1, 0, 0],
  carbon: [0.32, 0.25, 1, 0],
  leather: [0.55, 0, 0.2, 0],
  cloth: [0.88, 0, 0, 0],
  fur: [0.78, 0, 0, 0],
  skin: [0.6, 0, 0.15, 0],
  // Wet looking eyes catch a sharp highlight from the sky.
  eye: [0.12, 0, 1, 0],
  glass: [0.04, 0.1, 1, 0],
  lamp: [0.2, 0, 1, packGlow(2.4)],
  neon: [0.3, 0, 0, packGlow(3.2)],
  heat: [0.35, 0.6, 0, packGlow(4, "heat")],
  // Dark metal at rest that burns bright on boost: inside exhaust tips and the turbine.
  core: [0.4, 0.5, 0, packGlow(12, "heat")],
  brake: [0.18, 0, 1, packGlow(3, "brake")],
  head: [0.15, 0, 1, packGlow(2.6, "head")],
};
