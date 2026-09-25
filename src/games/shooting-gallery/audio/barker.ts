import { loadAudioSettings } from "@/platform/audio/audio-settings";

const START = ["Ready, aim, fire!", "Step right up and fire away!", "Ducks are out. Fire!"];
const LAST = ["Last five seconds!", "Five seconds left!"];
const WIN = ["We have a winner!", "Sharp shooting, folks!", "Give them a hand!"];

function pick(lines: readonly string[]): string {
  return lines[Math.floor(Math.random() * lines.length)]!;
}

/**
 * The fairground barker: a few short lines at the start, the last five
 * seconds and the winner. Spoken by the browser's own voice, which skips
 * the Web Audio graph, so its volume follows the player's effects level
 * by hand. Silent where the browser has no speech.
 */
export class Barker {
  private readonly speech = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;

  start(): void {
    this.say(pick(START));
  }

  last(): void {
    this.say(pick(LAST));
  }

  winner(): void {
    this.say(pick(WIN));
  }

  stop(): void {
    this.speech?.cancel();
  }

  private say(text: string): void {
    const volume = loadAudioSettings().effects;
    if (!this.speech || volume <= 0) return;
    const line = new SpeechSynthesisUtterance(text);
    line.volume = Math.min(1, volume * 0.9);
    // A touch fast and high, the barker's showman patter.
    line.rate = 1.08;
    line.pitch = 1.15;
    const voice = this.speech.getVoices().find((v) => v.lang.startsWith("en"));
    if (voice) line.voice = voice;
    this.speech.cancel();
    this.speech.speak(line);
  }
}
