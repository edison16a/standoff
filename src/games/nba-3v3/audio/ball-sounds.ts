import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise, tone } from "@/platform/audio/voices";
import { vary } from "./mix";

/**
 * The ball's own sounds, built from the physics of what rings. Each is a
 * handful of decaying sine modes, the way a struck object really sounds,
 * with only a breath of filtered noise for the contact itself, so
 * nothing hisses.
 *
 * The ball is a hollow sphere of air: its cavity rings at about 950 Hz
 * with overtones at 1.6 and 2.2 times that, which is the ping of an
 * indoor dribble. The rim is a steel ring whose bending modes sit at 1,
 * 2.83, 5.42 and 8.77 times the lowest; each mode is split in two by the
 * bracket, so a hard clank beats as it dies. The glass is a heavy panel
 * in a steel frame: a low boom and a short knock. Everything scales with
 * how hard the physics says the contact was.
 */

/** The ball's cavity modes: ratios to the lowest, and how loud each rings. */
const CAVITY = [
  { r: 1, amp: 1, decay: 0.09 },
  { r: 1.61, amp: 0.45, decay: 0.06 },
  { r: 2.16, amp: 0.25, decay: 0.045 },
];
/** In plane bending modes of a ring, n(n²-1)/√(n²+1), over the lowest. */
const RING = [1, 2.83, 5.42, 8.77, 12.9];

export class BallSounds {
  constructor(
    private readonly engine: AudioEngine,
    private readonly out: AudioNode,
    private readonly wet: AudioNode,
  ) {}

  private get at(): number {
    return this.engine.now + 0.004;
  }

  /** One decaying sine partial, with a send into the room when asked. */
  private mode(at: number, frequency: number, peak: number, decay: number, send = 0): void {
    if (peak < 0.002) return;
    tone(this.engine, this.out, at, { frequency, attack: 0.0015, decay, peak });
    if (send > 0) tone(this.engine, this.wet, at, { frequency, attack: 0.0015, decay: decay * 1.2, peak: peak * send });
  }

  /**
   * The ball on the hardwood: the slap of rubber on maple, the low thump
   * of the floor giving, and the ping of the air inside. A hard bounce
   * is louder and brighter; a low pound is mostly thump.
   */
  bounce(power: number, level = 1): void {
    const p = Math.min(1, Math.max(0, power)) * level;
    if (p < 0.02) return;
    const at = this.at;
    const low = vary(105, 0.05);
    tone(this.engine, this.out, at, { frequency: low, glideTo: low * 0.62, attack: 0.002, decay: 0.08, peak: 0.55 * p });
    // The boards of the floor, a short wooden knock.
    this.mode(at, vary(310, 0.04), 0.14 * p, 0.035);
    this.mode(at, vary(690, 0.04), 0.07 * p, 0.025);
    const ping = vary(950, 0.025);
    const bright = 0.35 + p * 0.65;
    CAVITY.forEach((c, i) => this.mode(at, ping * c.r, 0.075 * c.amp * p * (i === 0 ? 1 : bright), c.decay, i === 0 ? 0.5 : 0));
    // The contact itself: a few milliseconds of band limited air, not a hiss.
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: vary(1800, 0.1), q: 0.9, attack: 0.001, decay: 0.012, peak: 0.12 * p * bright });
  }

  /**
   * Through the net. The ball brushes the cords all the way down, slowing
   * as it goes, so the sound falls in pitch; the net then snaps back.
   * Clean through is long and airy; a ball that rattled in is shorter.
   */
  net(swish: boolean): void {
    const at = this.at;
    const f = vary(swish ? 2600 : 2100, 0.06);
    noise(this.engine, this.out, at, { filter: "bandpass", frequency: f, sweepTo: f * 0.45, q: 0.8, attack: 0.03, decay: swish ? 0.26 : 0.17, peak: swish ? 0.3 : 0.2 });
    // The cords bunching round the ball, a soft low rustle under the brush.
    noise(this.engine, this.out, at + 0.02, { filter: "lowpass", frequency: 900, sweepTo: 500, attack: 0.03, decay: 0.16, peak: swish ? 0.16 : 0.1 });
    // The snap back as the ball drops free.
    noise(this.engine, this.out, at + (swish ? 0.19 : 0.13), { filter: "bandpass", frequency: vary(1500, 0.08), q: 1.2, attack: 0.008, decay: 0.07, peak: swish ? 0.1 : 0.06 });
    noise(this.engine, this.wet, at + 0.02, { filter: "bandpass", frequency: 2000, q: 0.7, attack: 0.03, decay: 0.3, peak: 0.12 });
  }

  /**
   * The iron. A soft touch is a dull tick with only the lowest mode; a
   * hard hit rings the high modes too and rings much longer. Where the
   * ball strikes changes which modes speak, so no two clanks match.
   */
  rim(power: number): void {
    const p = Math.min(1, Math.max(0, power));
    const at = this.at;
    const base = vary(372, 0.02);
    const loud = 0.12 + p * 0.88;
    const ring = 0.12 + p * 0.55;
    RING.forEach((ratio, i) => {
      // High modes need a hard hit to wake them.
      const wake = i === 0 ? 1 : Math.pow(p, 0.6 + i * 0.35);
      const place = 0.55 + Math.random() * 0.9;
      const peak = (0.16 / (1 + i * 0.7)) * loud * wake * place;
      const decay = ring / (1 + i * 0.45);
      const f = base * ratio;
      // The bracket splits each mode into a close pair, which beats as the clank dies.
      this.mode(at, f, peak * 0.6, decay, i < 2 ? 0.5 : 0);
      this.mode(at, f * (1 + 0.004 + i * 0.001), peak * 0.4, decay * 0.85);
    });
    // The ball's own thud against the steel, and its cavity answering.
    tone(this.engine, this.out, at, { frequency: vary(150, 0.05), glideTo: 95, attack: 0.002, decay: 0.05, peak: 0.25 * loud });
    this.mode(at, vary(950, 0.03), 0.04 * loud, 0.05);
  }

  /**
   * The glass: a heavy panel in a steel frame. A boom of the board and
   * the stanchion, a short knock of the ball on the face, and a faint
   * ring of the frame after a hard one.
   */
  board(power: number): void {
    const p = 0.25 + Math.min(1, Math.max(0, power)) * 0.75;
    const at = this.at;
    const boom = vary(88, 0.05);
    tone(this.engine, this.out, at, { frequency: boom, glideTo: boom * 0.75, attack: 0.003, decay: 0.24, peak: 0.5 * p });
    this.mode(at, vary(212, 0.04), 0.22 * p, 0.12, 0.4);
    this.mode(at, vary(505, 0.04), 0.1 * p, 0.06);
    this.mode(at, vary(950, 0.03), 0.05 * p, 0.05);
    this.mode(at + 0.004, vary(1870, 0.03), 0.03 * p * p, 0.2, 0.6);
    noise(this.engine, this.out, at, { filter: "lowpass", frequency: 1400, attack: 0.001, decay: 0.02, peak: 0.12 * p });
  }
}
