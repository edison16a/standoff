import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { playerColor } from "@/games/kit/players";
import { segmentAt } from "../../engine/route";
import { Rng } from "../../engine/rng";
import { Atmosphere } from "../../render/atmosphere";
import { Effects } from "../../render/effects/effects";
import { setGunEnvironment } from "../../render/models/guns/gun-kit";
import { World } from "../../render/world/world";
import { Crew } from "./crew";
import { Horde } from "./horde";
import { shotsBetween, targetFor, truckAt, type Shot } from "./story";
import { buildTruck, WHEEL_RADIUS, type Truck } from "./truck";

type Triple = readonly [number, number, number];

/** Where the camera is for one frame. */
export interface CameraShot {
  position: Triple;
  lookAt: Triple;
  /** Vertical field of view, in degrees. */
  fov: number;
  /** Tilt of the horizon, in radians, for a Dutch angle. */
  roll?: number;
}

const at = new THREE.Vector3();
const dir = new THREE.Vector3();
const hit = new THREE.Vector3();

/**
 * The trailer's outside view: the game's city, fog, zombies, guns and
 * effects, with the team's truck racing through them. It draws the
 * chase at any story time from any camera. Gunfire between two frames
 * is played into the effects, so a cut restarts them clean with `cut`.
 */
export class CinemaSet {
  readonly camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 400);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly atmosphere: Atmosphere;
  private readonly world = new World();
  private readonly truck: Truck;
  private readonly crew: Crew;
  private readonly horde = new Horde();
  private readonly env: THREE.Texture;
  private effects: Effects;
  private rng = new Rng(1);
  private story: number | null = null;
  private readonly lastShot = new Map<number, number>();
  private readonly hits = new Map<number, number>();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.add(this.camera);
    this.atmosphere = new Atmosphere(this.scene, this.camera);
    // Outside the team's eyes, the flashlight becomes a soft key from the camera.
    this.atmosphere.flashlight.intensity = 22;
    this.atmosphere.gunLight.intensity = 0;
    this.truck = buildTruck();
    this.crew = new Crew(this.truck.body);
    this.effects = new Effects(() => this.rng.next());
    this.scene.add(this.atmosphere.group, this.world.group, this.truck.root, this.horde.group, this.effects.group);
  }

  resize(width: number, height: number, dpr: number): void {
    this.renderer.setPixelRatio(Math.min(dpr, 1.5));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  /** Starts a new shot: no sparks carried over from the last, and the same sprays each time. Call it before the first draw. */
  cut(seed: number): void {
    this.scene.remove(this.effects.group);
    this.effects.dispose();
    this.rng = new Rng(seed);
    this.effects = new Effects(() => this.rng.next());
    this.scene.add(this.effects.group);
    this.story = null;
    this.lastShot.clear();
    this.hits.clear();
    // The gun materials are shared with the game's own renderer, which sets its own reflections.
    setGunEnvironment(this.env, 0.5);
  }

  /** Draws story time `s`, seen from `shot`. `step` is how far the effects move on, in seconds. */
  draw(s: number, shot: (truck: THREE.Vector3) => CameraShot, step: number): void {
    const distance = truckAt(s);
    this.truck.root.position.set(0, 0, -distance);
    for (const wheel of this.truck.wheels) wheel.rotation.x = -distance / WHEEL_RADIUS;
    // The body rides the potholes on its springs.
    this.truck.body.position.y = 0.03 * Math.sin(s * 13) + 0.02 * Math.sin(s * 23 + 1);
    this.truck.body.rotation.set(0.01 * Math.sin(s * 9), 0, 0.012 * Math.sin(s * 7 + 2));

    this.horde.update(s, (id) => Math.max(0, 1 - (s - (this.hits.get(id) ?? -9)) * 5));
    this.scene.updateMatrixWorld();
    this.crew.update(
      s,
      (seat) => {
        const target = targetFor(seat, s);
        return target === null ? null : this.horde.chest(target, new THREE.Vector3());
      },
      (seat) => this.lastShot.get(seat) ?? -9,
    );
    this.scene.updateMatrixWorld();

    const from = this.story ?? s - 1e-3;
    if (s > from) for (const shot of shotsBetween(from, s)) this.fire(shot);
    this.story = s;
    this.effects.update(step);

    const frame = shot(this.truck.root.position);
    this.camera.position.set(...frame.position);
    this.camera.up.set(Math.sin(frame.roll ?? 0), Math.cos(frame.roll ?? 0), 0);
    this.camera.lookAt(...frame.lookAt);
    if (this.camera.fov !== frame.fov) {
      this.camera.fov = frame.fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.updateMatrixWorld();
    this.world.update(segmentAt(distance).index, this.camera.position, s, true);
    this.atmosphere.follow(this.camera.position);
    this.renderer.render(this.scene, this.camera);
  }

  /** Waits for the GPU, so frames do not pile up behind the capture's screenshots. */
  finish(): void {
    const gl = this.renderer.getContext();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  }

  dispose(): void {
    this.effects.dispose();
    this.world.dispose();
    this.horde.dispose();
    this.crew.dispose();
    this.truck.dispose();
    setGunEnvironment(null);
    this.env.dispose();
    this.renderer.dispose();
  }

  private fire(shot: Shot): void {
    if (!this.crew.muzzle(shot.seat, at, dir)) return;
    this.lastShot.set(shot.seat, shot.at);
    this.hits.set(shot.target, shot.at);
    const big = this.crew.weapon(shot.seat) === "shotgun";
    this.effects.muzzle(at, dir, big);
    this.horde.chest(shot.target, hit);
    // Every round lands a little off the chest, as real fire would.
    hit.x += (this.rng.next() - 0.5) * 0.3;
    hit.y += (this.rng.next() - 0.3) * 0.4;
    this.effects.tracer(at, hit, new THREE.Color(playerColor(shot.seat)));
    const normal = at.clone().sub(hit).normalize();
    this.effects.impact(hit, normal, "flesh", this.camera.position);
    if (shot.kill) this.effects.splatter(hit, big);
  }
}
