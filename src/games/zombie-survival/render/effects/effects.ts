import * as THREE from "three";
import { ROUNDS } from "../../ballistics/rounds";
import type { WeaponId } from "../../engine/weapons";
import { FlyingRounds, type Landing } from "../ballistics/flying-rounds";
import { roundKind } from "../ballistics/round-look";
import { lowQuality } from "../quality";
import { FLASH_STYLES } from "./flash-styles";
import { BarrelHeat } from "./heat";
import { Impacts, type Impact } from "./impacts";
import { MuzzleFlash } from "./muzzle-flash";
import { Smoke } from "./smoke";

export type { Impact } from "./impacts";

/** One bullet of a shot: where the raycast says it lands and what it strikes. */
export interface ShotRound {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  impact: Impact;
}

/** Everything the picture needs to know about one trigger pull. */
export interface ShotFx {
  seat: number;
  weapon: WeaponId;
  /** Rounds left in the gun after the shot, which says whether this one was a tracer. */
  left: number;
  muzzle: THREE.Vector3;
  dir: THREE.Vector3;
  /** The shooter's colour, for tracers. */
  colour: THREE.Color;
  eye: THREE.Vector3;
  rounds: readonly ShotRound[];
}

const POWDER = new THREE.Color(1, 0.72, 0.3);
const UP = new THREE.Vector3(0, 1, 0);
/** How big each gun's smoke cloud is next to the rifle's. */
const SMOKE_SCALE: Record<WeaponId, number> = { shotgun: 1.45, ak47: 1.15, rifle: 0.9, smg: 0.75 };
/** Only the first few pellets of a shot flash their hit, or buckshot would white out a zombie. */
const FLASHED = 3;

/**
 * Everything a shot leaves in the air: the flash and smoke at the
 * muzzle, the rounds flying at their real speed, and the impact when
 * each one gets there. Each part lives in its own module; this ties them
 * to one clock and one random source.
 */
export class Effects {
  readonly group = new THREE.Group();
  private readonly flash: MuzzleFlash;
  private readonly impacts: Impacts;
  private readonly smoke: Smoke;
  private readonly rounds: FlyingRounds;
  private readonly heat = new Map<number, BarrelHeat>();
  private readonly low: boolean;
  /** Where the camera was at the last shot, for sizing far hit flashes when the round lands. */
  private readonly eye = new THREE.Vector3();
  /** The air's colour, which lights smoke and the blast ring. The renderer sets it from the fog. */
  private readonly haze = new THREE.Color(0x3a4250);

  /** `random` shapes every flash and spray. The showcase seeds it, so its clip plays the same each time. */
  constructor(random: () => number = Math.random) {
    const low = (this.low = lowQuality());
    this.flash = new MuzzleFlash(random);
    this.impacts = new Impacts(random, low);
    this.smoke = new Smoke(random, low);
    this.rounds = new FlyingRounds(low ? 64 : 160, (at, landing) => this.land(at, landing));
    this.group.add(this.flash.group, this.impacts.group, this.smoke.mesh, this.rounds.mesh);
  }

  /** Lights smoke and haze with the scene's fog colour, so they sit in the same air. */
  setHaze(fog: THREE.Color): void {
    this.haze.copy(fog).lerp(new THREE.Color(0x9a9aa0), 0.35);
    this.smoke.setTint(this.haze);
  }

  /**
   * One trigger pull: the flash, the smoke, and every round sent flying.
   * Returns each round's flight time, in the same order, so whatever the
   * round hits can react when it arrives.
   */
  fire(shot: ShotFx): number[] {
    this.muzzle(shot.muzzle, shot.dir, shot.weapon, shot.seat);
    this.eye.copy(shot.eye);
    const spec = ROUNDS[shot.weapon];
    const kind = roundKind(shot.weapon);
    return shot.rounds.map((r, i) => {
      this.impacts.impact(r.point, r.normal, r.impact, i < FLASHED ? this.eye : undefined);
      return this.rounds.launch(spec, kind, shot.muzzle, r.point, shot.colour, { normal: r.normal, impact: "none", flash: false, miss: r.impact === "none" });
    });
  }

  /**
   * A muzzle flash for `weapon`. The showcase still passes `big` as a
   * flag, which reads as the AK's bloom or the rifle's split flash.
   * A `seat` heats that player's barrel, which smokes after rapid fire.
   */
  muzzle(at: THREE.Vector3, dir: THREE.Vector3, weapon: WeaponId | boolean, seat?: number): void {
    const id: WeaponId = typeof weapon === "string" ? weapon : weapon ? "ak47" : "rifle";
    const style = FLASH_STYLES[id];
    this.flash.fire(at, dir, style, this.haze);
    this.smoke.muzzle(at, dir, this.low ? Math.ceil(style.smoke / 2) : style.smoke, SMOKE_SCALE[id]);
    if (seat !== undefined) this.barrelHeat(seat).shot(id);
    // Unburnt powder flecks out with the gas.
    this.impacts.sparks.burst(at, dir, id === "shotgun" ? 8 : id === "ak47" ? 5 : 2, 4, 0.8, POWDER, 0.12);
  }

  /** A lone tracer round flying to `to`, where it stops. The showcase draws its fire with it and adds its own impacts. */
  tracer(from: THREE.Vector3, to: THREE.Vector3, colour: THREE.Color): void {
    this.rounds.launch(ROUNDS.rifle, "heat", from, to, colour, { normal: UP, impact: "none", flash: false, miss: false });
  }

  /** Each frame, per gun: a hot barrel cools and trails a thin wisp from its muzzle at `at`. */
  barrel(seat: number, at: THREE.Vector3, dt: number): void {
    const heat = this.heat.get(seat);
    if (!heat) return;
    const wisps = heat.step(dt);
    for (let i = 0; i < wisps; i++) this.smoke.wisp(at);
  }

  /** A puff of smoke trailing off something hot, like a spent shotgun hull. */
  trail(at: THREE.Vector3): void {
    this.smoke.trail(at);
  }

  /** Where a bullet lands, right now. `eye` adds a flash sized to the distance, so a far hit reads. */
  impact(at: THREE.Vector3, normal: THREE.Vector3, kind: Impact, eye?: THREE.Vector3): void {
    this.impacts.impact(at, normal, kind, eye);
  }

  /** A bigger spray for a kill or a broken weak point. */
  splatter(at: THREE.Vector3, big: boolean): void {
    this.impacts.splatter(at, big);
  }

  update(dt: number): void {
    // Rounds first, so an impact that lands this frame is drawn this frame.
    this.rounds.update(dt);
    this.flash.update(dt);
    this.impacts.update(dt);
    this.smoke.update(dt);
  }

  dispose(): void {
    this.flash.dispose();
    this.impacts.dispose();
    this.smoke.dispose();
    this.rounds.dispose();
  }

  /** A round has reached what it was fired at: sparks, goo or dust, and the hit flash. */
  private land(at: THREE.Vector3, landing: Landing): void {
    this.impacts.impact(at, landing.normal, landing.impact, landing.flash ? this.eye : undefined);
  }

  private barrelHeat(seat: number): BarrelHeat {
    let heat = this.heat.get(seat);
    if (!heat) this.heat.set(seat, (heat = new BarrelHeat()));
    return heat;
  }
}
