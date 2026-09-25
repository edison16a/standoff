/**
 * A random factor near 1, for pitch and level. Repeated sounds drift a
 * little each time, so a run of coins or footsteps never sounds robotic.
 */
export function vary(spread = 0.04): number {
  return 1 + (Math.random() * 2 - 1) * spread;
}

/** A node that carries a sound across the stereo field, then unhooks itself. */
export function travel(ctx: BaseAudioContext, out: AudioNode, at: number, from: number, to: number, length: number): StereoPannerNode {
  const panner = ctx.createStereoPanner();
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  panner.pan.setValueAtTime(clamp(from), at);
  panner.pan.linearRampToValueAtTime(clamp(to), at + length);
  panner.connect(out);
  setTimeout(() => panner.disconnect(), (at - ctx.currentTime + length + 0.5) * 1000);
  return panner;
}
