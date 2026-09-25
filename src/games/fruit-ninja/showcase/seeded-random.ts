import { Rng } from "../engine/rng";

/**
 * Swaps Math.random for a seeded one until the returned function is
 * called. The effects scatter juice and sparks with Math.random, and the
 * capture tool needs the same film every time. Only the showcase page
 * does this: nothing else runs there.
 */
export function seedRandom(seed: number): () => void {
  const original = Math.random;
  const rng = new Rng(seed);
  Math.random = () => rng.next();
  return () => {
    Math.random = original;
  };
}
