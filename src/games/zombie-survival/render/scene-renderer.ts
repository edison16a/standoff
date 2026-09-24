import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { ScreenPoint } from "@/games/kit/aim/aim-math";
import { playerColor } from "@/games/kit/players";
import type { Seat } from "@/platform/protocol";
import type { GameEvent } from "../engine/events";
import { fightFrame, segmentAt } from "../engine/route";
import type { Offset, PelletHit } from "../engine/shooting";
import { makeZombie, type Zombie } from "../engine/zombie";
import { isBoss, ZOMBIE_KINDS, type ZombieKind } from "../engine/zombie-kinds";
import type { SurvivalHost, SurvivalView } from "../host/survival-host";
import { AimCaster, type CastResult } from "./aim-caster";
import { Atmosphere } from "./atmosphere";
import { gallery, lowQuality } from "./quality";
import { CameraRig, sailed } from "./camera-rig";
import { ChopperView } from "./chopper-view";
import { Effects } from "./effects/effects";
import { FirstPerson, type Shooter } from "./first-person";
import { setGunEnvironment } from "./models/guns/gun-kit";
import { World } from "./world/world";
import { ZombieLayer } from "./zombie-layer";

/** Zombies shambling in the fog behind the lobby, for mood. */
function lobbyZombies(): Zombie[] {
  const opts = (seed: number) => ({ hpScale: 1, speedScale: 1, harm: 1, weakHp: 1, seed });
  const show = gallery();
  if (show) {
    return show.kinds.map((kind, i) => {
      const known = (ZOMBIE_KINDS as readonly string[]).includes(kind) ? (kind as ZombieKind) : "walker";
      const wide = isBoss(known) ? 4.5 : 1.7;
      const side = (i - (show.kinds.length - 1) / 2) * wide;
      const z = makeZombie(-1 - i, known, isBoss(known) ? 12 : 6.8, side, side, opts(0.3 + i * 0.17));
      if (show.pose === "attack" || show.pose === "dead" || show.pose === "stagger") z.state = show.pose;
      return z;
    });
  }
  return [makeZombie(-1, "walker", 21, -2.5, -2.5, opts(0.2)), makeZombie(-2, "walker", 27, 2, 2, opts(0.7)), makeZombie(-3, "brute", 33, -0.5, -0.5, opts(0.45))];
}

/**
 * Draws the game: the city, the zombies, the team's guns and lasers and
 * every shot's effects, from the host session's state each frame. It is
 * also the session's raycaster, since only the picture knows exactly
 * where each zombie's head is right now.
 */
export class SurvivalRenderer implements SurvivalView {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.05, 400);
  private readonly rig = new CameraRig();
  private readonly world = new World();
  private readonly zombies = new ZombieLayer();
  private readonly effects = new Effects();
  private readonly guns: FirstPerson;
  private readonly chopper: ChopperView;
  private readonly caster: AimCaster;
  private readonly env: THREE.Texture;
  private readonly atmosphere: Atmosphere;
  private readonly pending = new Map<Seat, CastResult[]>();
  private readonly idle = lobbyZombies();
  private last = 0;
  private shipBase: THREE.Vector3 | null = null;
  private lastSegment = 0;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly session: SurvivalHost,
  ) {
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
    const game = this.session.game;
    this.rig.update(this.camera, game, dt, time);
    this.camera.updateMatrixWorld();
    const segment = game.phase === "lobby" ? 1 : segmentAt(game.distance).index;
    this.world.update(segment, this.camera.position, time, Math.abs(segment - this.lastSegment) > 1);
    this.lastSegment = segment;
    this.atmosphere.follow(this.camera.position);

    const fighting = game.encounter !== null;
    if (game.phase === "lobby") {
      for (const z of this.idle) {
        z.age += dt;
        z.stateTime += dt;
        // The gallery's attack pose swings on a loop.
        if (z.state === "attack") z.swingIn = z.swingIn - dt <= 0 ? 2.5 : z.swingIn - dt;
        if (z.state === "stagger" && z.stateTime > 0.4) z.stateTime = 0;
      }
    }
    const list = game.phase === "lobby" ? this.idle : (game.encounter?.zombies ?? []);
    this.zombies.sync(list, game.phase === "lobby" ? fightFrame(0) : fighting ? fightFrame(game.stage) : null, dt);
    this.chopper.update(game, dt, time);
    this.sailShip(game);
    this.scene.updateMatrixWorld();

    const shooters = this.shooters(nowMs);
    const armed = game.phase !== "cutscene" && game.phase !== "escaped";
    this.guns.update(shooters, dt, time, armed);
    this.effects.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  cast(seat: Seat, point: ScreenPoint, offsets: readonly Offset[]): (PelletHit | null)[] {
    const targets = [...this.zombies.proxies(), ...this.world.solids()];
    const results = offsets.map((offset) => this.caster.cast(point, offset, targets, (id) => this.session.game.encounter?.find(id)));
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
      this.effects.impact(r.point, r.normal, r.impact);
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

  /** For browser tests: every hit shape on screen, in the aim's clip space. */
  debugTargets(): { zombie: number; part: string; weak: number | null; x: number; y: number; distance: number }[] {
    return this.zombies.proxies().map((proxy) => {
      const at = proxy.getWorldPosition(new THREE.Vector3());
      const distance = at.distanceTo(this.camera.position);
      at.project(this.camera);
      const data = proxy.userData as { zombie: number; part: string; weak: number | null };
      return { zombie: data.zombie, part: data.part, weak: data.weak, x: at.x, y: at.y, distance };
    });
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

  /** Every player with a gun: the squad in a run, or anyone who has picked one in the lobby. */
  private shooters(nowMs: number): Shooter[] {
    const game = this.session.game;
    const seats = game.running
      ? game.squad.present().map((m) => ({ seat: m.seat, weapon: m.gun.weapon }))
      : this.session.players.filter((p) => p.connected && this.session.lobby.get(p.seat).weapon).map((p) => ({ seat: p.seat, weapon: this.session.lobby.get(p.seat).weapon! }));
    const targets = [...this.zombies.proxies(), ...this.world.solids()];
    return seats.map(({ seat, weapon }) => {
      const point = this.session.aim.point(seat, nowMs);
      const aim = point ? this.caster.cast(point, { x: 0, y: 0 }, targets, () => undefined).point : null;
      return { seat, weapon, aim };
    });
  }

  /** The ship pulls away from the pier in the escape, carrying the team. */
  private sailShip(game: SurvivalHost["game"]): void {
    const ship = this.world.segment(26)?.group.getObjectByName("ship");
    if (!ship) return;
    this.shipBase ??= ship.position.clone();
    const t = game.phase === "cutscene" && game.cutscene === "escape" ? game.phaseTime : game.phase === "escaped" ? 13 + game.phaseTime : 0;
    ship.position.copy(this.shipBase);
    ship.position.x += sailed(t);
  }
}
