import type { CharacterId } from "@/games/blade-clash/characters";
import type { Slot } from "@/games/blade-clash/players";
import type { AudioEngine } from "../../../platform/audio/audio-engine";
import { noise, tone } from "../../../platform/audio/voices";
import { armourHit, footstep } from "./armour";
import { BLADE_VOICE, clash, strike, whoosh } from "./blade-sounds";
import { createRoom, vary, type Room } from "./mix";

/** Each player's own sounds lean toward their half of the screen. */
const PAN: Record<Slot, number> = { 1: -0.35, 2: 0.35 };

/**
 * One shot effects. Each is fired straight off the game event that also
 * drives the picture, so the whoosh and the swing start together. The
 * big ones are a sharp transient, a body and a tail into the arena's
 * reverb, pitched a little differently each time, and a player's own
 * sounds sit on their side of the room.
 */
export class Sfx {
  private room: Room | null = null;
  private panners: Record<Slot, StereoPannerNode> | null = null;

  constructor(private readonly engine: AudioEngine) {}

  private get out(): AudioNode {
    return this.engine.bus("sfx");
  }

  /** Built on first use, so the phone, which only clicks and chimes, never pays for it. */
  private get wet(): AudioNode {
    this.room ??= createRoom(this.engine, this.engine.bus("sfx"), 1.8, 0.45);
    return this.room.input;
  }

  /** The sound path for one player's side. */
  side(slot: Slot): AudioNode {
    if (!this.panners) {
      const make = (pan: number) => {
        const panner = this.engine.ctx.createStereoPanner();
        panner.pan.value = pan;
        panner.connect(this.out);
        return panner;
      };
      this.panners = { 1: make(PAN[1]), 2: make(PAN[2]) };
    }
    return this.panners[slot];
  }

  whoosh(slot: Slot, character: CharacterId, strength: number): void {
    whoosh(this.engine, this.side(slot), BLADE_VOICE[character], strength);
  }

  clash(characters: readonly CharacterId[], strength: number): void {
    clash(this.engine, this.out, this.wet, characters.map((c) => BLADE_VOICE[c]), strength);
  }

  /** A hit: the blade's bite, the armour's answer and the thump of the body, on the side of who took it. */
  hit(attacker: CharacterId, victim: CharacterId, victimSlot: Slot): void {
    const out = this.side(victimSlot);
    strike(this.engine, out, BLADE_VOICE[attacker]);
    armourHit(this.engine, out, victim);
    this.impact(out);
  }

  step(slot: Slot, character: CharacterId, weight: number): void {
    footstep(this.engine, this.side(slot), character, weight);
  }

  /** A body hit: a crack, a low thump and the arena answering. */
  impact(out: AudioNode = this.out): void {
    const at = this.engine.now;
    const f = vary(150, 0.06);
    noise(this.engine, out, at, { filter: "bandpass", frequency: vary(3200, 0.1), q: 2, decay: 0.05, peak: 0.24 });
    tone(this.engine, out, at, { frequency: f, glideTo: f * 0.36, decay: 0.28, peak: 0.5 });
    noise(this.engine, out, at, { filter: "lowpass", frequency: 1800, decay: 0.12, peak: 0.4 });
    noise(this.engine, this.wet, at, { filter: "lowpass", frequency: 2200, decay: 0.3, peak: 0.3 });
  }

  /** The starting signal: a struck gong, low and long. */
  gong(): void {
    const at = this.engine.now;
    for (const [frequency, peak, decay] of [[98, 0.3, 2.4], [196.7, 0.14, 1.8], [262, 0.08, 1.4], [331, 0.05, 1]] as const) {
      tone(this.engine, this.out, at, { frequency, decay, peak });
      tone(this.engine, this.wet, at, { frequency, decay: decay * 1.2, peak: peak * 0.5 });
    }
    noise(this.engine, this.out, at, { filter: "lowpass", frequency: 900, decay: 0.12, peak: 0.3 });
  }

  /** A war drum for each second of the countdown. */
  tick(): void {
    const at = this.engine.now;
    tone(this.engine, this.out, at, { frequency: 90, glideTo: 55, decay: 0.35, peak: 0.35 });
    noise(this.engine, this.out, at, { filter: "lowpass", frequency: 500, decay: 0.1, peak: 0.2 });
  }

  /** A two note chime: a calibration target captured on the phone, or the winning blow on the big screen. */
  chime(): void {
    const at = this.engine.now + 0.12;
    tone(this.engine, this.out, at, { type: "triangle", frequency: 1047, decay: 0.5, peak: 0.16 });
    tone(this.engine, this.out, at + 0.11, { type: "triangle", frequency: 1568, decay: 0.7, peak: 0.16 });
    tone(this.engine, this.out, at + 0.11, { frequency: 3136, decay: 0.3, peak: 0.03 });
  }

  /** A quiet click for interface actions, on its own bus. */
  click(): void {
    tone(this.engine, this.engine.bus("ui"), this.engine.now, { type: "triangle", frequency: 1800, decay: 0.035, peak: 0.25 });
  }

  dispose(): void {
    this.room?.dispose();
    this.room = null;
    if (this.panners) for (const slot of [1, 2] as const) this.panners[slot].disconnect();
    this.panners = null;
  }
}
