import { loadAudioSettings } from "../../../platform/audio/audio-settings";

/**
 * The announcer, through the browser's own speech: the start of the
 * fight, the big clashes and the winner. Only the latest line matters, so
 * a new one cuts off the old. Browsers without speech just stay quiet.
 */
export class Announcer {
  private voice: SpeechSynthesisVoice | null = null;
  private readonly synth: SpeechSynthesis | null;

  /** `onSpeak` hears every line that is actually spoken, so the director can duck the hall under it. */
  constructor(private readonly onSpeak: () => void = () => {}) {
    this.synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
    if (!this.synth) return;
    this.choose();
    this.synth.addEventListener?.("voiceschanged", this.choose);
  }

  private readonly choose = () => {
    const voices = this.synth?.getVoices() ?? [];
    this.voice = voices.find((v) => v.lang.startsWith("en")) ?? null;
  };

  say(line: string, rate = 1.05, pitch = 0.8): void {
    // Speech skips the Web Audio graph, so the player's effects volume is applied here.
    const volume = loadAudioSettings().effects;
    if (!this.synth || volume === 0) return;
    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(line);
    if (this.voice) utterance.voice = this.voice;
    utterance.lang = this.voice?.lang ?? "en";
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    this.synth.speak(utterance);
    this.onSpeak();
  }

  stop(): void {
    this.synth?.cancel();
    this.synth?.removeEventListener?.("voiceschanged", this.choose);
  }
}
