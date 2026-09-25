import type { AudioEngine } from "@/platform/audio/audio-engine";
import { loadAudioSettings } from "@/platform/audio/audio-settings";

/**
 * The race caller, spoken by the browser's own voice. Speech never passes
 * through the Web Audio graph, so its volume follows the player's sound
 * effects setting by hand, and the music dips while it talks. A short
 * quiet spell after each line keeps it from talking over itself.
 */
export class Announcer {
  private quietUntil = 0;

  constructor(private readonly engine: AudioEngine) {}

  /** `urgent` lines cut off whatever is being said; others wait their turn or are dropped. */
  say(text: string, urgent = false, quietS = 4): void {
    const synth = typeof window === "undefined" ? undefined : window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") return;
    const level = loadAudioSettings().effects;
    // Speech bypasses the audio graph, so it also keeps quiet while the engine is still locked.
    if (!this.engine.unlocked) return;
    const now = performance.now() / 1000;
    if (level < 0.02 || (!urgent && (now < this.quietUntil || synth.speaking))) return;
    if (urgent) synth.cancel();
    const line = new SpeechSynthesisUtterance(text);
    line.volume = Math.min(1, level);
    line.rate = 1.12;
    line.pitch = 1.05;
    const voice = pickVoice(synth);
    if (voice) line.voice = voice;
    synth.speak(line);
    this.quietUntil = now + quietS;
    this.engine.duck("music", 0.5, 1.6);
  }

  /** A line picked at random, so the same moment is not called the same way twice in a row. */
  sayOne(lines: readonly string[], urgent = false): void {
    this.say(lines[Math.floor(Math.random() * lines.length)]!, urgent);
  }

  stop(): void {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }
}

/** An English voice, preferring the livelier network voices where the browser has them. */
function pickVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | undefined {
  const english = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  return english.find((v) => /google|natural|daniel|samantha/i.test(v.name)) ?? english[0];
}
