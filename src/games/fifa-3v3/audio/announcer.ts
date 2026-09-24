/**
 * The stadium announcer, through the browser's own speech. It says a
 * few words for the big moments: Goal, What a save, Off the post. A new
 * big moment cuts off an old line, so it never falls behind the play.
 * Browsers without speech just stay quiet.
 */
export class Announcer {
  private voice: SpeechSynthesisVoice | null = null;
  private readonly synth: SpeechSynthesis | null;

  constructor() {
    this.synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
    if (!this.synth) return;
    const choose = () => {
      const voices = this.synth!.getVoices().filter((v) => v.lang.startsWith("en"));
      // A British or American male voice sounds most like a commentator, where there is one.
      this.voice = voices.find((v) => /daniel|male|david|george|arthur/i.test(v.name)) ?? voices.find((v) => v.lang === "en-GB") ?? voices[0] ?? null;
    };
    choose();
    this.synth.addEventListener?.("voiceschanged", choose);
  }

  /** `urgent` lines interrupt whatever is being said. */
  say(text: string, options: { urgent?: boolean; pitch?: number; rate?: number } = {}): void {
    if (!this.synth) return;
    if (options.urgent) this.synth.cancel();
    else if (this.synth.speaking || this.synth.pending) return;
    const line = new SpeechSynthesisUtterance(text);
    if (this.voice) line.voice = this.voice;
    line.pitch = options.pitch ?? 1;
    line.rate = options.rate ?? 1.05;
    line.volume = 1;
    this.synth.speak(line);
  }

  stop(): void {
    this.synth?.cancel();
  }
}
