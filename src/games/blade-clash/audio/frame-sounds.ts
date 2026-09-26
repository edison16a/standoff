import type { StageFrame } from "@/games/blade-clash/engine/frames";
import { SLOTS, type PerSlot } from "@/games/blade-clash/players";
import type { AudioEngine } from "../../../platform/audio/audio-engine";
import { EnergyHum } from "./hum";
import type { Sfx } from "./sfx";

/** Walking this far along the line is one step. */
const STRIDE = 0.42;

interface Track {
  x: number;
  walked: number;
  tip: { x: number; y: number; z: number };
  t: number;
  speed: number;
}

/**
 * The sounds that follow the fighters rather than any one event: the
 * energy blade's hum, rising as it swings, and the armour on every step.
 * It reads the same frames the renderer draws, so a fighter in the lobby
 * already hums and clanks.
 */
export class FrameSounds {
  private readonly hums: PerSlot<EnergyHum>;
  private readonly tracks: PerSlot<Track | null> = { 1: null, 2: null };

  constructor(
    engine: AudioEngine,
    private readonly sfx: Sfx,
  ) {
    this.hums = { 1: new EnergyHum(engine, sfx.side(1)), 2: new EnergyHum(engine, sfx.side(2)) };
  }

  update(frame: StageFrame): void {
    for (const slot of SLOTS) {
      const fighter = frame.fighters.find((f) => f.slot === slot);
      if (!fighter) {
        this.tracks[slot] = null;
        this.hums[slot].stop();
        continue;
      }
      const last = this.tracks[slot];
      const tip = { ...fighter.sword.tip };
      // A new bout or a fresh fighter starts counting from here.
      const fresh = !last || frame.t < last.t || Math.abs(fighter.x - last.x) > 0.6;
      const track: Track = fresh ? { x: fighter.x, walked: 0, tip, t: frame.t, speed: 0 } : last;
      if (!fresh && frame.t > track.t) {
        const dt = (frame.t - track.t) / 1000;
        const moved = Math.hypot(tip.x - track.tip.x, tip.y - track.tip.y, tip.z - track.tip.z);
        // Smoothed, so one jumpy frame does not make the hum hiccup.
        track.speed += (moved / dt - track.speed) * Math.min(1, dt * 20);
        track.walked += Math.abs(fighter.x - track.x);
        if (track.walked >= STRIDE && fighter.action !== "defeat") {
          track.walked -= STRIDE;
          this.sfx.step(slot, fighter.characterId, Math.min(1, Math.abs(fighter.speed) / 1.7));
        }
      }
      track.x = fighter.x;
      track.tip = tip;
      track.t = frame.t;
      this.tracks[slot] = track;
      this.hums[slot].update(fighter.characterId === "star" && fighter.action !== "defeat", track.speed);
    }
  }

  stop(): void {
    for (const slot of SLOTS) this.hums[slot].stop();
  }
}
