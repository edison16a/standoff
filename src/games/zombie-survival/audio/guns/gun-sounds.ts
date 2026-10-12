import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { Seat } from "@/platform/protocol";
import { WEAPONS, type WeaponId } from "../../engine/weapons";
import { playCasing } from "./casing-sounds";
import { casingClinks } from "./clinks";
import { GunBus } from "./gun-bus";
import { playCue } from "./mechanics";
import { closeOutCues, nextShellCues, reloadCues, shotCues, type Cue } from "./reload-plan";
import { SampleBank } from "./sample-bank";
import { SeatTimers, type Booking } from "./seat-timers";
import { playShot } from "./shot-voices";

/**
 * Every gun sound in Zombie Survival, driven by the game's events. Shots,
 * cases, dry clicks and each step of a reload are timed from the shared
 * ballistics timelines, panned toward the player's gun, and sent through
 * one street echo into the room's effects bus.
 */
export class GunSounds {
  private readonly bus: GunBus;
  private readonly bank: SampleBank;
  private readonly timers: SeatTimers;
  /** Seats whose pump gun ran dry before the reload now running, so it ends on a rack. */
  private readonly fromEmpty = new Set<Seat>();

  constructor(private readonly engine: AudioEngine) {
    this.bus = new GunBus(engine);
    this.bank = new SampleBank(engine.ctx);
    this.timers = new SeatTimers(() => engine.now);
  }

  /** A shot: the report, the action cycling, and the case bouncing on the street. */
  shot(seat: Seat, weapon: WeaponId, shotId: number, left: number, pan: number): void {
    const at = this.engine.now;
    // A pump gun fired mid reload stops loading.
    this.timers.cancel(seat, "reload");
    this.fromEmpty.delete(seat);
    playShot(this.engine, this.bus, this.bank, weapon, pan, at);
    this.book(seat, "cycle", weapon, pan, at, shotCues(weapon, left));
    playCasing(this.engine, this.bus, this.bank, weapon, pan, at, casingClinks(weapon, seat, shotId));
  }

  /** The trigger falling on an empty chamber. */
  dry(weapon: WeaponId, pan: number): void {
    playCue(this.engine, this.bus, this.bank, weapon, "dry", pan, this.engine.now);
  }

  reloadStart(seat: Seat, weapon: WeaponId, seconds: number, empty: boolean, pan: number): void {
    this.timers.cancel(seat, "reload");
    if (empty) this.fromEmpty.add(seat);
    else this.fromEmpty.delete(seat);
    this.book(seat, "reload", weapon, pan, this.engine.now, reloadCues(weapon, seconds, empty, perShell(weapon)));
  }

  /** A shell counted into the tube. Its sound was booked ahead; plan the next one if there is room. */
  shell(seat: Seat, weapon: WeaponId, more: boolean, pan: number): void {
    if (more) this.book(seat, "reload", weapon, pan, this.engine.now, nextShellCues(perShell(weapon)));
  }

  /** The reload is done. A pump gun loaded from empty racks a shell into the chamber. */
  reloaded(seat: Seat, weapon: WeaponId, pan: number): void {
    if (weapon === "shotgun" && this.fromEmpty.has(seat)) this.book(seat, "reload", weapon, pan, this.engine.now, closeOutCues());
    this.fromEmpty.delete(seat);
  }

  /** Calls off every booked sound, for a new stage or a retry, where guns are refilled on the spot. */
  reset(): void {
    this.timers.clear();
    this.fromEmpty.clear();
  }

  dispose(): void {
    this.reset();
    this.bus.dispose();
  }

  private book(seat: Seat, kind: Booking, weapon: WeaponId, pan: number, from: number, cues: readonly Cue[]): void {
    for (const { cue, at } of cues) {
      this.timers.book(seat, kind, from + at, (when) => playCue(this.engine, this.bus, this.bank, weapon, cue, pan, when));
    }
  }
}

function perShell(weapon: WeaponId): number {
  return WEAPONS[weapon].shell ?? 0.4;
}
