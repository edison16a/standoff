import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { PowerKind } from "../engine/types";
import * as cues from "./cues";
import * as hits from "./hits";
import * as moves from "./moves";

/**
 * Every one shot sound of the run, synthesised on the spot. `pan` puts a
 * sound on its player's side of the room in split screen, so each hears
 * their own coins from their own half. The sounds themselves live in
 * `moves`, `hits` and `cues`; this keeps the panners and the clock.
 */
export class Sfx {
  private readonly panners = new Map<number, StereoPannerNode>();

  constructor(private readonly engine: AudioEngine) {}

  private out(pan: number): AudioNode {
    let node = this.panners.get(pan);
    if (!node) {
      node = this.engine.ctx.createStereoPanner();
      node.pan.value = Math.max(-1, Math.min(1, pan));
      node.connect(this.engine.bus("sfx"));
      this.panners.set(pan, node);
    }
    return node;
  }

  /** Unhooks the panners, once the room closes. */
  dispose(): void {
    for (const node of this.panners.values()) node.disconnect();
    this.panners.clear();
  }

  private get at(): number {
    return this.engine.now + 0.005;
  }

  coin(streak: number, pan: number): void {
    moves.coin(this.engine, this.out(pan), this.at, streak);
  }

  footstep(pan: number, left: boolean): void {
    moves.footstep(this.engine, this.out(pan), this.at, left);
  }

  jump(pan: number, boots: boolean): void {
    moves.jump(this.engine, this.out(pan), this.at, boots);
  }

  land(pan: number, speed: number, roof: boolean): void {
    moves.land(this.engine, this.out(pan), this.at, speed, roof);
  }

  roll(pan: number): void {
    moves.roll(this.engine, this.out(pan), this.at);
  }

  lane(pan: number, dir: number): void {
    // The swish pans itself, so it goes straight to the bus.
    moves.lane(this.engine, this.engine.bus("sfx"), this.at, pan, Math.sign(dir));
  }

  stumble(pan: number): void {
    hits.stumble(this.engine, this.out(pan), this.at);
  }

  crash(pan: number): void {
    hits.crash(this.engine, this.out(pan), this.at);
  }

  saved(pan: number): void {
    hits.saved(this.engine, this.out(pan), this.at);
  }

  horn(pan: number): void {
    hits.horn(this.engine, this.out(pan), this.at);
  }

  passBy(pan: number): void {
    hits.passBy(this.engine, this.out(pan), this.at);
  }

  whistle(pan: number): void {
    hits.whistle(this.engine, this.out(pan), this.at);
  }

  bark(pan: number): void {
    hits.bark(this.engine, this.out(pan), this.at);
  }

  power(pan: number, kind: PowerKind): void {
    cues.power(this.engine, this.out(pan), this.at, kind);
  }

  powerEnd(pan: number): void {
    cues.powerEnd(this.engine, this.out(pan), this.at);
  }

  level(pan: number): void {
    cues.level(this.engine, this.out(pan), this.at);
  }

  countdown(go: boolean): void {
    cues.countdown(this.engine, this.out(0), this.at, go);
  }

  tick(pan: number): void {
    cues.tick(this.engine, this.out(pan), this.at);
  }

  pause(): void {
    cues.pause(this.engine, this.out(0), this.at);
  }
}
