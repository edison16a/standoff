import * as THREE from "three";
import type { WeaponId } from "../../engine/weapons";
import { lowQuality } from "../quality";
import { FLASH_STYLES } from "./flash-styles";
import { BarrelHeat } from "./heat";
import { Impacts, type Impact } from "./impacts";
import { MuzzleFlash } from "./muzzle-flash";
import { Smoke } from "./smoke";

export type { Impact } from "./impacts";

interface Tracer {
  mesh: THREE.Mesh;
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
}

const POWDER = new THREE.Color(1, 0.72, 0.3);
/** How big each gun's smoke cloud is next to the rifle's. */
const SMOKE_SCALE: Record<WeaponId, number> = { shotgun: 1.45, ak47: 1.15, rifle: 0.9, smg: 0.75 };

/**
 * Everything a shot leaves in the air: the flash at the muzzle with its
 * burst of light, a streak of tracer to the hit, and the impact where it
 * lands. Each part lives in its own module; this ties them to one clock.
 */
export class Effects {
  readonly group = new THREE.Group();
  private readonly flash: MuzzleFlash;
  private readonly impacts: Impacts;
  private readonly smoke: Smoke;
  private readonly heat = new Map<number, BarrelHeat>();
  private readonly low: boolean;
  private readonly tracers: Tracer[] = [];
  private readonly tracerGeo = new THREE.CylinderGeometry(0.018, 0.018, 1, 6, 1, true).rotateX(Math.PI / 2);
  /** The air's colour, which lights smoke and the blast ring. The renderer sets it from the fog. */
  private readonly haze = new THREE.Color(0x3a4250);

  /** `random` shapes every flash and spray. The showcase seeds it, so its clip plays the same each time. */
  constructor(private readonly random: () => number = Math.random) {
    const low = (this.low = lowQuality());
    this.flash = new MuzzleFlash(random);
    this.impacts = new Impacts(random, low);
    this.smoke = new Smoke(random, low);
    this.group.add(this.flash.group, this.impacts.group, this.smoke.mesh);
  }

  /** Lights smoke and haze with the scene's fog colour, so they sit in the same air. */
  setHaze(fog: THREE.Color): void {
    this.haze.copy(fog).lerp(new THREE.Color(0x9a9aa0), 0.35);
    this.smoke.setTint(this.haze);
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

  tracer(from: THREE.Vector3, to: THREE.Vector3, colour: THREE.Color): void {
    let tracer = this.tracers.find((t) => t.t >= 1);
    if (!tracer) {
      const material = new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
      tracer = { mesh: new THREE.Mesh(this.tracerGeo, material), from: new THREE.Vector3(), to: new THREE.Vector3(), t: 1 };
      this.tracers.push(tracer);
      this.group.add(tracer.mesh);
    }
    tracer.from.copy(from);
    tracer.to.copy(to);
    tracer.t = 0;
    (tracer.mesh.material as THREE.MeshBasicMaterial).color.copy(colour).lerp(new THREE.Color(1, 0.95, 0.8), 0.6);
    tracer.mesh.visible = true;
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

  /** Where a bullet lands. `eye` adds a flash sized to the distance, so a far hit reads. */
  impact(at: THREE.Vector3, normal: THREE.Vector3, kind: Impact, eye?: THREE.Vector3): void {
    this.impacts.impact(at, normal, kind, eye);
  }

  /** A bigger spray for a kill or a broken weak point. */
  splatter(at: THREE.Vector3, big: boolean): void {
    this.impacts.splatter(at, big);
  }

  update(dt: number): void {
    this.flash.update(dt);
    this.impacts.update(dt);
    this.smoke.update(dt);
    for (const tracer of this.tracers) {
      if (tracer.t >= 1) continue;
      tracer.t = Math.min(1, tracer.t + dt / 0.09);
      const head = tracer.from.clone().lerp(tracer.to, Math.min(1, tracer.t * 1.3));
      const tail = tracer.from.clone().lerp(tracer.to, Math.max(0, tracer.t * 1.3 - 0.45));
      const length = head.distanceTo(tail);
      tracer.mesh.position.copy(head).add(tail).multiplyScalar(0.5);
      tracer.mesh.lookAt(head);
      tracer.mesh.scale.set(1, 1, Math.max(0.01, length));
      (tracer.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - tracer.t * 0.6;
      tracer.mesh.visible = tracer.t < 1;
    }
  }

  dispose(): void {
    this.flash.dispose();
    this.impacts.dispose();
    this.smoke.dispose();
    this.tracerGeo.dispose();
    for (const t of this.tracers) (t.mesh.material as THREE.Material).dispose();
  }

  private barrelHeat(seat: number): BarrelHeat {
    let heat = this.heat.get(seat);
    if (!heat) this.heat.set(seat, (heat = new BarrelHeat()));
    return heat;
  }
}
