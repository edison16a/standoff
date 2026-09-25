import { loadAudioSettings } from "@/platform/audio/audio-settings";

/**
 * The announcer, through the browser's own speech on the host computer.
 * Lines are short and loud, one at a time, and a big call cuts off a
 * small one. Speech skips the Web Audio graph, so the player's effects
 * volume is applied to each line here. Without speech the game simply
 * has no voice.
 */
export class Announcer {
  private voice: SpeechSynthesisVoice | null = null;
  private busyUntil = 0;
  private priority = 0;
  private readonly synth: SpeechSynthesis | null;
  private readonly choose: () => void;

  /** `onSpeak` hears every line that is actually spoken, so the mix can duck under it. */
  constructor(private readonly onSpeak: (priority: number) => void = () => {}) {
    this.synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
    this.choose = () => {
      const voices = this.synth?.getVoices() ?? [];
      // A deep English voice sounds most like a fighting game announcer.
      const english = voices.filter((v) => v.lang.startsWith("en"));
      const liked = /daniel|david|alex|fred|guy|male|google uk english male|arthur|aaron|rishi/i;
      this.voice = english.find((v) => liked.test(v.name)) ?? english[0] ?? null;
    };
    this.choose();
    this.synth?.addEventListener?.("voiceschanged", this.choose);
  }

  /**
   * Says a line. Priority 2 is Fight, Game and the last KO, 1 a KO, 0
   * small talk. A line never cuts off a more important one.
   */
  say(text: string, priority = 1): void {
    const synth = this.synth;
    const volume = Math.max(0, Math.min(1, loadAudioSettings().effects));
    if (!synth || volume === 0) return;
    const now = performance.now();
    if (now < this.busyUntil && priority <= this.priority) return;
    if (synth.speaking) synth.cancel();
    const line = new SpeechSynthesisUtterance(text);
    if (this.voice) line.voice = this.voice;
    line.rate = priority >= 2 ? 0.92 : 1.05;
    line.pitch = 0.62;
    line.volume = volume;
    synth.speak(line);
    this.onSpeak(priority);
    this.priority = priority;
    this.busyUntil = now + 400 + text.length * 60;
  }

  stop(): void {
    this.synth?.removeEventListener?.("voiceschanged", this.choose);
    this.synth?.cancel();
  }
}
