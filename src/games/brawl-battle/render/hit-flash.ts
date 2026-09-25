/** How white a struck fighter glows: a floor, more per point of damage, and a ceiling below full white. */
const FLASH = { base: 0.3, perDamage: 0.012, max: 0.55 };

/**
 * A hit that lands on several fighters at once, like an ult, draws a
 * flash and a spark on each of them in the same frame. Each is dimmed
 * by the square root of how many landed, so the crowd still reads as
 * struck without the whole group washing out to white.
 */
export function crowdFade(struck: number): number {
  return 1 / Math.sqrt(Math.max(1, struck));
}

/** The peak white glow of a struck fighter, from 0 to 1. */
export function hitFlash(damage: number, struck: number): number {
  return Math.min(FLASH.max, FLASH.base + damage * FLASH.perDamage) * crowdFade(struck);
}
