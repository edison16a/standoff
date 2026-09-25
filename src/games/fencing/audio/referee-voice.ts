import { loadAudioSettings } from "../../../platform/audio/audio-settings";

/**
 * The referee's calls, through the browser's own speech: "En garde",
 * "Prêts", "Allez", "Halte" and "Touché", the words of a real bout. A
 * French voice is used where the computer has one. Only the latest call
 * matters, so a new one cuts off the old. Browsers without speech just
 * stay quiet.
 */
export class RefereeVoice {
  private voice: SpeechSynthesisVoice | null = null;
  private french = false;
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
    const french = voices.find((v) => v.lang.startsWith("fr"));
    this.french = Boolean(french);
    this.voice = french ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
  };

  /** `english` is how the same call is spelled for an English voice to say it right. */
  call(french: string, english = french, rate = 1): void {
    // Speech skips the Web Audio graph, so the player's effects volume is applied here.
    const volume = loadAudioSettings().effects;
    if (!this.synth || volume === 0) return;
    this.synth.cancel();
    const line = new SpeechSynthesisUtterance(this.french ? french : english);
    if (this.voice) line.voice = this.voice;
    line.lang = this.voice?.lang ?? "en";
    line.rate = rate;
    line.pitch = 0.9;
    line.volume = volume;
    this.synth.speak(line);
    this.onSpeak();
  }

  stop(): void {
    this.synth?.cancel();
    this.synth?.removeEventListener?.("voiceschanged", this.choose);
  }
}
