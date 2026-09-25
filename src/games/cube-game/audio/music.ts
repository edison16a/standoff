import type { AudioEngine } from "@/platform/audio/audio-engine";
import { playStep, type Outputs } from "./arrange";
import { MusicMixer } from "./mixer";
import type { Song } from "./song";
import { SONGS } from "./songs";

const WAKE_MS = 25;
const LOOKAHEAD_S = 0.15;

/** One playing of a song, with its own gains so it can fade out while the next one starts. */
interface Take {
  id: string;
  song: Song;
  outputs: Outputs & { gains: GainNode[] };
  /** Audio time of the song's step 0. */
  origin: number;
  next: number;
}

/**
 * Plays the songs with a lookahead scheduler: a timer wakes often and
 * books every sixteenth due soon on the audio clock, so the beat holds
 * while the page is busy drawing. A take can start on any beat, which is
 * how a run picks the music up exactly where the level is.
 */
export class Music {
  readonly mixer: MusicMixer;
  private take: Take | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly engine: AudioEngine) {
    this.mixer = new MusicMixer(engine);
  }

  get playing(): string | null {
    return this.take?.id ?? null;
  }

  /**
   * Starts a song so that `fromBeat` sounds at audio time `at`. Returns
   * that time, so callers can hold their own clock to the music.
   */
  play(id: string, fromBeat = 0, at = this.engine.now + 0.06): number {
    const song = SONGS[id] ?? SONGS.menu!;
    this.fadeOut(0.06);
    const outputs = this.outputs();
    const spb = 60 / song.bpm;
    const first = Math.ceil(fromBeat * 4 - 1e-6);
    const origin = at - fromBeat * spb;
    this.take = { id, song, outputs, origin, next: first };
    this.mixer.setTempo(song.bpm);
    this.mixer.fadeTo(1, 0.05);
    this.timer ??= setInterval(() => this.schedule(), WAKE_MS);
    this.schedule();
    return at;
  }

  /** Where the current song is, in beats from its top, at an audio time. */
  beatAt(time = this.engine.now): number | null {
    if (!this.take) return null;
    return (time - this.take.origin) / (60 / this.take.song.bpm);
  }

  stop(fade = 0.3): void {
    this.fadeOut(fade);
    this.take = null;
  }

  setMuffled(muffled: boolean): void {
    this.mixer.setMuffled(muffled);
  }

  dispose(): void {
    this.stop(0.05);
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    setTimeout(() => this.mixer.dispose(), 400);
  }

  private schedule(): void {
    const take = this.take;
    if (!take) return;
    const sixteenth = 60 / take.song.bpm / 4;
    const now = this.engine.now;
    // After a stall, skip what was missed instead of playing it all at once.
    const due = Math.floor((now - take.origin) / sixteenth);
    if (take.next < due - 2) take.next = due;
    const loop = take.song.length * 4;
    while (take.origin + take.next * sixteenth < now + LOOKAHEAD_S) {
      const at = take.origin + take.next * sixteenth;
      // Steps before the top of the song are a silent count in.
      if (at >= now - 0.01 && take.next >= 0) playStep(this.engine, take.outputs, take.song, ((take.next % loop) + loop) % loop, at);
      take.next += 1;
    }
  }

  private outputs(): Take["outputs"] {
    const { ctx } = this.engine;
    const make = (to: AudioNode) => {
      const gain = ctx.createGain();
      gain.connect(to);
      return gain;
    };
    const gains = [make(this.mixer.dry), make(this.mixer.space), make(this.mixer.pumped)];
    return { dry: gains[0]!, space: gains[1]!, pumped: gains[2]!, gains, duckAt: (at, beat) => this.mixer.duckAt(at, beat) };
  }

  private fadeOut(seconds: number): void {
    if (!this.take) return;
    const { gains } = this.take.outputs;
    for (const gain of gains) gain.gain.setTargetAtTime(0.0001, this.engine.now, seconds / 3);
    // Held pads and echoes ring on a little, then the take's gains are let go.
    setTimeout(() => gains.forEach((gain) => gain.disconnect()), seconds * 1000 + 3000);
  }
}
