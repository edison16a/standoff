import { SAMPLE_NAMES, sampleUrl, type SampleName } from "./manifest";

/** A decoded recording, and where its sound actually starts. */
export interface Sample {
  buffer: AudioBuffer;
  /**
   * Seconds of near silence before the first sound. MP3 decoders pad the
   * start by a few milliseconds, and not all browsers strip it, so the
   * shot would land late. Playback starts here instead.
   */
  start: number;
}

/** Where the sound starts: the first sample within `belowDb` of the peak, backed off a couple of milliseconds. */
export function leadIn(data: Float32Array, sampleRate: number, belowDb = 36): number {
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]!));
  if (peak === 0) return 0;
  const floor = peak * 10 ** (-belowDb / 20);
  for (let i = 0; i < data.length; i++) {
    if (Math.abs(data[i]!) >= floor) return Math.max(0, i / sampleRate - 0.002);
  }
  return 0;
}

/** One load per audio context, so a second game in the same room reuses the decoded buffers. */
const loads = new WeakMap<BaseAudioContext, Map<SampleName, Promise<Sample | null>>>();

function load(ctx: BaseAudioContext, name: SampleName): Promise<Sample | null> {
  let byName = loads.get(ctx);
  if (!byName) loads.set(ctx, (byName = new Map()));
  const known = byName.get(name);
  if (known) return known;
  const loading = fetch(sampleUrl(name))
    .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(`${res.status}`))))
    .then((bytes) => ctx.decodeAudioData(bytes))
    .then((buffer) => ({ buffer, start: leadIn(buffer.getChannelData(0), buffer.sampleRate) }))
    // A missing or undecodable file is not fatal: the synthesised voice plays instead.
    .catch(() => null);
  byName.set(name, loading);
  return loading;
}

/**
 * The gun recordings, fetched and decoded in the background when the game
 * starts. Until a file is ready (or if it never arrives) `pick` returns
 * nothing and the caller synthesises the sound, so the first shots of a
 * slow connection still go bang.
 */
export class SampleBank {
  private readonly ready = new Map<SampleName, Sample>();

  constructor(ctx: BaseAudioContext) {
    for (const name of SAMPLE_NAMES) {
      void load(ctx, name).then((sample) => {
        if (sample) this.ready.set(name, sample);
      });
    }
  }

  /** A random loaded take among `names`, or undefined if none has arrived yet. */
  pick(names: readonly SampleName[] | undefined, random = Math.random): Sample | undefined {
    if (!names) return undefined;
    const loaded = names.filter((n) => this.ready.has(n));
    if (loaded.length === 0) return undefined;
    return this.ready.get(loaded[Math.floor(random() * loaded.length)]!);
  }
}

export interface PlayOptions {
  /** Playback speed. Above 1 is faster and higher, like a smaller part. */
  rate?: number;
  gain?: number;
  /** Cuts the sample short with a quick fade, for duller materials. */
  length?: number;
}

/** Plays a sample once at `at` into `out`, cleaning up after itself. */
export function playSample(ctx: BaseAudioContext, out: AudioNode, sample: Sample, at: number, options: PlayOptions = {}): void {
  const source = ctx.createBufferSource();
  source.buffer = sample.buffer;
  source.playbackRate.value = options.rate ?? 1;
  const gain = ctx.createGain();
  gain.gain.value = options.gain ?? 1;
  source.connect(gain).connect(out);
  const when = Math.max(at, ctx.currentTime);
  source.start(when, sample.start);
  if (options.length !== undefined) {
    const end = when + options.length;
    gain.gain.setValueAtTime(options.gain ?? 1, Math.max(when, end - 0.03));
    gain.gain.linearRampToValueAtTime(0, end);
    source.stop(end + 0.01);
  }
  source.onended = () => gain.disconnect();
}
