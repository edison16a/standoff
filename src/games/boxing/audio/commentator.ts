import { loadAudioSettings } from "@/platform/audio/audio-settings";
import type { MatchEvent } from "../engine/events";
import { RULES } from "../engine/rules";
import type { FighterId } from "../engine/types";

/** Colour lines wait at least this long after the last one, so the call never turns to chatter. */
const COLOUR_GAP_MS = 5_000;

const pick = (lines: readonly string[]) => lines[Math.floor(Math.random() * lines.length)]!;

/** How a line is spoken: cutting in, after whatever is being said, or only if the booth is quiet. */
type Mode = "cut" | "queue" | "colour";

/**
 * The ringside commentator, spoken by the browser's own voice. The big
 * moments always get a call (the introductions, a knockdown, the end);
 * counters and big shots get one only now and then. Speech skips the Web
 * Audio graph, so its volume follows the player's effects level by hand.
 */
export class Commentator {
  private readonly speech = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
  private names: [string, string] = ["Red", "Blue"];
  private lastColour = 0;

  /** Full names of the two boxers, red corner first. */
  setNames(names: [string, string]): void {
    this.names = names;
  }

  event(event: MatchEvent): void {
    const surname = (id: FighterId) => this.names[id].split(" ").pop()!;
    switch (event.type) {
      case "intro":
        return this.say(`${this.names[0]} versus ${this.names[1]}. Let's get it on!`, "cut");
      case "round":
        if (event.round > 1) this.say(event.round === RULES.rounds ? "Final round!" : `Round ${event.round}!`, "cut");
        return;
      case "hit":
        if (event.stagger) return this.say(pick([event.counter ? "What a counter!" : "What a shot!", `${surname(event.target)} is hurt!`, "He is stunned, back to the corner!"]), "colour");
        if (event.heavy && Math.random() < 0.5) return this.say(event.style === "hook" ? pick(["Huge hook!", "Big left hook!"]) : pick(["Big right hand!", "Oh, that landed!"]), "colour");
        return;
      case "miss":
        if (event.dodge && Math.random() < 0.15) this.say(pick(["Slick defence!", "Just missed!"]), "colour");
        return;
      case "knockdown":
        return this.say(pick([`Down goes ${surname(event.fighter)}!`, `${surname(event.fighter)} is down!`]), "cut");
      case "rise":
        return this.say(pick([`${surname(event.fighter)} beats the count!`, "He's up!"]), "cut");
      case "stoppage":
        return this.say(event.method === "KO" ? "It's all over! Knockout!" : "The referee waves it off!", "cut");
      case "bell":
        if (event.kind === "end" && Math.random() < 0.5) this.say(pick(["What a round!", "Back to the corners."]), "colour");
        return;
      case "touch":
        if (!event.timedOut && Math.random() < 0.4) this.say(pick(["They touch gloves.", "Good sportsmanship."]), "colour");
        return;
      case "over": {
        const { winner, method } = event.result;
        if (winner === null) return this.say("It's a draw!", "queue");
        const name = this.names[winner];
        if (method === "Decision") return this.say(`The judges give it to ${name}!`, "queue");
        return this.say(`${name} wins by ${method === "KO" ? "knockout" : "stoppage"}!`, "queue");
      }
      default:
        return;
    }
  }

  stop(): void {
    this.speech?.cancel();
  }

  private say(text: string, mode: Mode): void {
    const volume = loadAudioSettings().effects;
    if (!this.speech || volume <= 0) return;
    if (mode === "colour") {
      const now = performance.now();
      if (this.speech.speaking || now - this.lastColour < COLOUR_GAP_MS) return;
      this.lastColour = now;
    }
    if (mode === "cut") this.speech.cancel();
    const line = new SpeechSynthesisUtterance(text);
    line.volume = Math.min(1, volume);
    // Quick and a little low, the broadcast booth's urgency.
    line.rate = 1.12;
    line.pitch = 0.9;
    const voice = this.speech.getVoices().find((v) => v.lang.startsWith("en"));
    if (voice) line.voice = voice;
    this.speech.speak(line);
  }
}
