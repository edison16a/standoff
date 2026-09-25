import { loadAudioSettings } from "@/platform/audio/audio-settings";

/**
 * The stadium announcer, through the browser's own speech. It says a
 * few words for the big moments: Goal, What a save, Off the post. A new
 * big moment cuts off an old line, so it never falls behind the play.
 * Browsers without speech just stay quiet.
 */
export class Announcer {
  private voice: SpeechSynthesisVoice | null = null;
  private readonly synth: SpeechSynthesis | null;

  /** `onSpeak` hears every line that is actually spoken, so the director can duck the stadium under it. */
  constructor(private readonly onSpeak: (urgent: boolean) => void = () => {}) {
    this.synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
    if (!this.synth) return;
    this.choose();
    this.synth.addEventListener?.("voiceschanged", this.choose);
  }

  private readonly choose = () => {
    const voices = this.synth?.getVoices().filter((v) => v.lang.startsWith("en")) ?? [];
    // A British or American male voice sounds most like a commentator, where there is one.
    this.voice = voices.find((v) => /daniel|male|david|george|arthur/i.test(v.name)) ?? voices.find((v) => v.lang === "en-GB") ?? voices[0] ?? null;
  };

  /** `urgent` lines interrupt whatever is being said. */
  say(text: string, options: { urgent?: boolean; pitch?: number; rate?: number } = {}): void {
    // Speech skips the Web Audio graph, so the player's effects volume is applied here.
    const volume = loadAudioSettings().effects;
    if (!this.synth || volume === 0) return;
    if (options.urgent) this.synth.cancel();
    else if (this.synth.speaking || this.synth.pending) return;
    const line = new SpeechSynthesisUtterance(text);
    if (this.voice) line.voice = this.voice;
    line.pitch = options.pitch ?? 1;
    line.rate = options.rate ?? 1.05;
    line.volume = volume;
    this.synth.speak(line);
    this.onSpeak(options.urgent ?? false);
  }

  /** Quiet now, and for good: the room is closing. */
  stop(): void {
    this.synth?.cancel();
    this.synth?.removeEventListener?.("voiceschanged", this.choose);
  }
}
