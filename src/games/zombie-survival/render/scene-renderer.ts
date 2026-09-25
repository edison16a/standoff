import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { ScreenPoint } from "@/games/kit/aim/aim-math";
import { playerColor } from "@/games/kit/players";
import type { Seat } from "@/platform/protocol";
import type { GameEvent } from "../engine/events";
import { fightFrame, segmentAt } from "../engine/route";
import { stage as stageSpec } from "../engine/stages";
import type { Offset, PelletHit } from "../engine/shooting";
import { isBoss } from "../engine/zombie-kinds";
import type { SurvivalView } from "../host/survival-host";
import { AimCaster, type CastResult } from "./aim-caster";
import { Atmosphere } from "./atmosphere";
import { lowQuality } from "./quality";
import type { SceneSource, TargetPoint } from "./scene-source";
import { CameraRig, sailed } from "./camera-rig";
import { ChopperView } from "./chopper-view";
import { Effects } from "./effects/effects";
import { EscapeHorde } from "./escape-horde";
import { FirstPerson, type Shooter } from "./first-person";
import { ageIdle, lobbySetting, lobbyZombies, settingFor } from "./idle-zombies";
import { setGunEnvironment } from "./models/guns/gun-kit";
import { World } from "./world/world";
import { ZombieLayer } from "./zombie-layer";

/**
 * Draws the game: the city, the zombies, the team's guns and lasers and
 * every shot's effects, from the source's state each frame. It is also
 * the session's raycaster, since only the picture knows exactly where
 * each zombie's head is right now.
 */
export class SurvivalRenderer implements SurvivalView {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(56, 16 / 9, 0.05, 400);
  private readonly rig: CameraRig;
  private readonly world = new World();
  private readonly zombies = new ZombieLayer();
  private readonly effects: Effects;
  private readonly guns: FirstPerson;
  private readonly chopper: ChopperView;
  private readonly caster: AimCaster;
  private readonly env: THREE.Texture;
  private readonly atmosphere: Atmosphere;
  private readonly pending = new Map<Seat, CastResult[]>();
  private readonly idle = lobbyZombies();
  private readonly horde = new EscapeHorde();
  private last = 0;
  private lastSegment = 0;
  private readonly probe = new Uint8Array(4);

  /** `random` drives the shake and the sprays. The showcase seeds it, so its clip plays the same each time. */
  constructor(
    canvas: HTMLCanvasElement,
    private readonly source: SceneSource,
    random: () => number = Math.random,
  ) {
    this.rig = new CameraRig(random);
    this.effects = new Effects(random);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    setGunEnvironment(this.env);
    this.scene.add(this.camera);
    this.atmosphere = new Atmosphere(this.scene, this.camera);
    this.guns = new FirstPerson(this.camera);
    this.chopper = new ChopperView(this.scene, this.effects);
    this.caster = new AimCaster(this.camera);
    this.scene.add(this.atmosphere.group, this.world.group, this.zombies.group, this.effects.group, this.guns.lasers);
  }

  resize(width: number, height: number, dpr: number): void {
    this.renderer.setPixelRatio(lowQuality() ? 0.4 : Math.min(dpr, 1.5));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  frame(nowMs: number): void {
    const dt = this.last ? Math.min(0.1, (nowMs - this.last) / 1000) : 0;
    this.last = nowMs;
    const time = nowMs / 1000;
    const game = this.source.game;
    this.rig.update(this.camera, game, dt, time);
    this.reframe();
    this.camera.updateMatrixWorld();
    const segment = game.phase === "lobby" ? 1 : segmentAt(game.distance).index;
    this.world.update(segment, this.camera.position, time, Math.abs(segment - this.lastSegment) > 1);
    this.lastSegment = segment;
    this.atmosphere.follow(this.camera.position);

    const fighting = game.encounter !== null;
    if (game.phase === "lobby") ageIdle(this.idle, dt);
    const horde = this.horde.update(game, dt);
    const list = game.phase === "lobby" ? this.idle : horde.length ? horde : (game.encounter?.zombies ?? []);
    this.zombies.setting = game.phase === "lobby" ? lobbySetting() : settingFor(stageSpec(game.stage).zone);
    const frame = game.phase === "lobby" ? fightFrame(0) : horde.length ? this.horde.frame : fighting ? fightFrame(game.stage) : null;
    this.zombies.sync(list, frame, dt);
    // On the ship's deck the flashlight would only glare off the planks at your feet.
    const escaping = game.phase === "escaped" || (game.phase === "cutscene" && game.cutscene === "escape" && game.phaseTime > 9);
    this.atmosphere.flashlight.intensity = escaping ? 0 : 85;
    this.atmosphere.gunLight.intensity = escaping ? 0 : 1.6;
    this.chopper.update(game, dt, time);
    this.world.sailShip(sailed(game.phase === "escaped" ? 16 + game.phaseTime : game.cutscene === "escape" ? game.phaseTime : 0));
    this.scene.updateMatrixWorld();

    const shooters = this.shooters(nowMs);
    const armed = game.phase !== "cutscene" && game.phase !== "escaped";
    this.guns.update(shooters, dt, time, armed);
    this.effects.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Waits until the GPU has drawn everything asked of it, so a frame is on
   * the canvas before the next begins. Browsers treat finish() as a flush,
   * so reading back one pixel is what really waits.
   */
  finish(): void {
    const gl = this.renderer.getContext();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.probe);
  }

  cast(seat: Seat, point: ScreenPoint, offsets: readonly Offset[]): (PelletHit | null)[] {
    const targets = [...this.zombies.proxies(), ...this.world.solids()];
    const results = offsets.map((offset) => this.caster.cast(point, offset, targets, (id) => this.source.game.encounter?.find(id)));
    this.pending.set(seat, results);
    return results.map((r) => r.hit);
  }

  shotFx(seat: Seat): void {
    const rig = this.guns.rig(seat);
    const results = this.pending.get(seat) ?? [];
    this.pending.delete(seat);
    if (!rig) return;
    rig.fire();
    const at = new THREE.Vector3();
    const dir = new THREE.Vector3();
    rig.muzzle(at, dir);
    this.effects.muzzle(at, dir, rig.big);
    const colour = new THREE.Color(playerColor(seat));
    results.forEach((r, i) => {
      if (i < 3) this.effects.tracer(at, r.point, colour);
      this.effects.impact(r.point, r.normal, r.impact, i < 3 ? this.camera.position : undefined);
    });
    this.rig.kick(rig.big ? 0.12 : 0.04);
  }

  react(event: GameEvent): void {
    const rig = "seat" in event && event.seat ? this.guns.rig(event.seat) : undefined;
    const at = new THREE.Vector3();
    switch (event.type) {
      case "reload-start":
        return rig?.startReload(event.seconds);
      case "shell":
        return rig?.shell();
      case "reloaded":
        return rig?.finishReload();
      case "hit":
        if (!event.killed) this.zombies.flinch(event.zombie);
        return;
      case "kill":
        if (this.zombies.chest(event.zombie, at)) this.effects.splatter(at, isBoss(event.kind));
        return;
      case "weak-broken":
        if (this.zombies.chest(event.zombie, at)) this.effects.splatter(at, true);
        return;
      case "swing":
        return this.rig.kick(event.damage > 10 ? 0.9 : 0.45);
      default:
        return;
    }
  }

  /** Every hit shape on screen, in the aim's clip space. Browser tests and the showcase's players aim with it. */
  targets(): TargetPoint[] {
    return this.zombies.targets(this.camera);
  }

  dispose(): void {
    this.zombies.dispose();
    this.world.dispose();
    this.guns.dispose();
    this.chopper.dispose();
    this.effects.dispose();
    setGunEnvironment(null);
    this.env.dispose();
    this.renderer.dispose();
  }

  /** Applies the source's own framing, if it has one, over the camera rig's. */
  private reframe(): void {
    const shot = this.source.framing?.();
    if (!shot) return;
    this.camera.rotateX(-shot.tilt);
    if (this.camera.fov === shot.fov) return;
    this.camera.fov = shot.fov;
    this.camera.updateProjectionMatrix();
  }

  /** Every player with a gun, and where their laser lands. */
  private shooters(nowMs: number): Shooter[] {
    const targets = [...this.zombies.proxies(), ...this.world.solids()];
    return this.source.armed().map(({ seat, weapon }) => {
      const point = this.source.aimAt(seat, nowMs);
      const aim = point ? this.caster.cast(point, { x: 0, y: 0 }, targets, () => undefined).point : null;
      return { seat, weapon, aim };
    });
  }
}
