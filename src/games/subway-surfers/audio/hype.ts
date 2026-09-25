import type { AudioEngine } from "@/platform/audio/audio-engine";
import { loadAudioSettings } from "@/platform/audio/audio-settings";
import type { PowerKind } from "../engine/types";

/**
 * A short hype voice on power ups, and the guard calling out when he
 * catches someone. Spoken by the browser's own voice, which never passes
 * through the Web Audio graph, so its volume follows the player's sound
 * effects setting by hand. A quiet spell after each line keeps two
 * players grabbing power ups from talking over each other.
 */

const POWER_LINES: Record<PowerKind, readonly string[]> = {
  boots: ["Jump boots!", "Sky high!"],
  hoverboard: ["Hoverboard!", "Board up!"],
  magnet: ["Coin magnet!", "Magnet!"],
  double: ["Double score!", "Double up!"],
  jetpack: ["Jetpack!", "Blast off!"],
};

const CAUGHT_LINES = ["Busted!", "Gotcha!"];

export class Hype {
  private quietUntil = 0;

  constructor(private readonly engine: AudioEngine) {}

  power(kind: PowerKind): void {
    this.say(pick(POWER_LINES[kind]), { rate: 1.15, pitch: 1.2 });
  }

  caught(): void {
    this.say(pick(CAUGHT_LINES), { rate: 1, pitch: 0.7 }, true);
  }

  stop(): void {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }

  private say(text: string, tone: { rate: number; pitch: number }, urgent = false): void {
    const synth = typeof window === "undefined" ? undefined : window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined" || !this.engine.unlocked) return;
    const level = loadAudioSettings().effects;
    const now = performance.now() / 1000;
    if (level < 0.02 || (!urgent && (now < this.quietUntil || synth.speaking))) return;
    if (urgent) synth.cancel();
    const line = new SpeechSynthesisUtterance(text);
    line.volume = Math.min(1, level);
    line.rate = tone.rate;
    line.pitch = tone.pitch;
    const voice = pickVoice(synth);
    if (voice) line.voice = voice;
    synth.speak(line);
    this.quietUntil = now + 3;
    this.engine.duck("music", 0.55, 1.1);
  }
}

function pick(lines: readonly string[]): string {
  return lines[Math.floor(Math.random() * lines.length)]!;
}

/** An English voice, preferring the livelier network voices where the browser has them. */
function pickVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | undefined {
  const english = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  return english.find((v) => /google|natural|samantha|daniel/i.test(v.name)) ?? english[0];
}
