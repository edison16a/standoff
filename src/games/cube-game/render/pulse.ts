/**
 * How hard the world glows on the beat: 1 right on it, easing away before
 * the next. The downbeat of each bar hits a little harder.
 */
export function beatPulse(time: number, bpm: number): number {
  if (time < 0) return 0;
  const beats = (time * bpm) / 60;
  const phase = beats - Math.floor(beats);
  const strong = Math.floor(beats) % 4 === 0 ? 1 : 0.7;
  return strong * Math.exp(-phase * 5);
}
