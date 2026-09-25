/**
 * The colour of a damage percent: white when fresh, through yellow and
 * orange to a deep red past 150, the way fighting games warn that the
 * next big hit will send someone flying.
 */
const STOPS: [number, [number, number, number]][] = [
  [0, [255, 255, 255]],
  [40, [255, 236, 120]],
  [80, [255, 160, 60]],
  [120, [244, 63, 54]],
  [170, [160, 16, 30]],
];

export function heatColour(percent: number): string {
  const p = Math.max(0, percent);
  for (let i = 1; i < STOPS.length; i++) {
    const [to, b] = STOPS[i]!;
    const [from, a] = STOPS[i - 1]!;
    if (p <= to) {
      const t = (p - from) / (to - from);
      const mix = a.map((v, k) => Math.round(v + (b[k]! - v) * t));
      return `rgb(${mix.join(", ")})`;
    }
  }
  return `rgb(${STOPS[STOPS.length - 1]![1].join(", ")})`;
}

/** How hard the percent shakes, 0 to 1. */
export function shakeAmount(percent: number): number {
  return Math.max(0, Math.min(1, (percent - 20) / 130));
}
