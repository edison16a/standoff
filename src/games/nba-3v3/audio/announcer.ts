/**
 * The arena announcer, through the browser's own speech (the Web Speech
 * API on the host computer). Lines are short and punchy, only one plays
 * at a time, and a big call cuts off a small one. Where speech is not
 * available the game is simply without a voice.
 */
export class Announcer {
  private voice: SpeechSynthesisVoice | null = null;
  private busyUntil = 0;
  private priority = 0;
  private readonly synth: SpeechSynthesis | null;
  private muted = false;
  private readonly choose: () => void;

  constructor() {
    this.synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
    this.choose = () => {
      const voices = this.synth?.getVoices() ?? [];
      // A deep English voice sounds most like an arena announcer.
      const english = voices.filter((v) => v.lang.startsWith("en"));
      const liked = /daniel|david|alex|fred|guy|male|google uk english male|arthur|aaron/i;
      this.voice = english.find((v) => liked.test(v.name)) ?? english[0] ?? null;
    };
    this.choose();
    this.synth?.addEventListener?.("voiceschanged", this.choose);
  }

  /**
   * Says a line. `priority` 2 is a dunk, a win or a block, 1 a basket, 0
   * small talk; a line never cuts off a more important one.
   */
  say(text: string, priority = 1, level = 1): void {
    const synth = this.synth;
    if (!synth || this.muted) return;
    const now = performance.now();
    if (now < this.busyUntil && priority <= this.priority) return;
    if (synth.speaking) synth.cancel();
    const line = new SpeechSynthesisUtterance(text);
    if (this.voice) line.voice = this.voice;
    line.rate = priority >= 2 ? 1.08 : 1.12;
    line.pitch = 0.78;
    line.volume = Math.max(0, Math.min(1, level));
    synth.speak(line);
    this.priority = priority;
    this.busyUntil = now + 450 + text.length * 55;
  }

  mute(muted: boolean): void {
    this.muted = muted;
    if (muted) this.synth?.cancel();
  }

  stop(): void {
    this.synth?.removeEventListener?.("voiceschanged", this.choose);
    this.synth?.cancel();
  }
}
