import * as THREE from "three";
import { OrbitCamera } from "../camera/orbit-camera";
import type { OrbitShot } from "../camera/orbit";
import { VictoryConfetti, type ConfettiOptions } from "../confetti/victory-confetti";
import { StageLights, type StageLightsOptions } from "../lights/stage-lights";
import { disposeTree } from "../trophies/materials";
import { stageFloor, studioEnvironment } from "./environment";

export interface VictoryRoomOptions {
  /** The colour behind everything, which the fog fades into. */
  background?: string;
  floorColour?: string;
  lights?: StageLightsOptions;
  confetti?: ConfettiOptions;
  orbit?: Partial<OrbitShot>;
  /** Largest device pixel ratio drawn at. */
  maxDpr?: number;
}

/**
 * A ready made winners' room for a game whose own renderer cannot host
 * the celebration: its own canvas filling `holder`, a dark glossy stage,
 * a studio to reflect in, spotlights, confetti and a circling camera.
 * Put the winners and trophies in `scene`, then `start`. Everything is
 * freed on `dispose`, including whatever was added to the scene.
 */
export class VictoryRoom {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 120);
  readonly lights: StageLights;
  readonly confetti: VictoryConfetti;
  readonly orbit: OrbitCamera;
  private readonly canvas: HTMLCanvasElement;
  private readonly environment: THREE.Texture;
  private readonly resize: ResizeObserver | null;
  private readonly listeners = new Set<(dt: number, time: number) => void>();
  private frame = 0;
  private last = 0;
  private time = 0;

  constructor(
    private readonly holder: HTMLElement,
    private readonly options: VictoryRoomOptions = {},
  ) {
    // Its own canvas, so a canvas whose context was released is never reused when React mounts twice.
    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    holder.appendChild(this.canvas);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    const background = options.background ?? "#07070c";
    this.scene.background = new THREE.Color(background);
    this.scene.fog = new THREE.Fog(background, 12, 30);
    this.environment = studioEnvironment(this.renderer);
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = 0.55;
    this.scene.add(stageFloor(40, options.floorColour));
    this.scene.add(new THREE.HemisphereLight("#b9c6ff", "#1a1320", 0.5));
    const key = new THREE.DirectionalLight("#fff4e0", 1.2);
    key.position.set(3, 8, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = key.shadow.camera.bottom = -6;
    key.shadow.camera.right = key.shadow.camera.top = 6;
    key.shadow.bias = -0.0005;
    this.scene.add(key);
    this.lights = new StageLights({ count: 4, ...options.lights });
    this.lights.aimAt(new THREE.Vector3(0, 0, 0));
    this.scene.add(this.lights.object);
    this.confetti = new VictoryConfetti(options.confetti);
    this.scene.add(this.confetti.object);
    this.orbit = new OrbitCamera(this.camera, options.orbit);
    this.resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => this.fit());
    this.resize?.observe(holder);
    this.fit();
    // In development a test driver can find every open room and run it forward, since software rendering is slow.
    if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
      const dev = window as unknown as { __victoryRooms?: Set<VictoryRoom> };
      (dev.__victoryRooms ??= new Set()).add(this);
    }
  }

  /** Called every frame before drawing, with seconds since the last frame and since the start. */
  onFrame(listener: (dt: number, time: number) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start(): void {
    if (this.frame) return;
    this.last = performance.now();
    this.orbit.play();
    this.frame = requestAnimationFrame(this.draw);
  }

  /** Runs the scene `seconds` forward in small steps without drawing, to open part way through. */
  advance(seconds: number): void {
    const step = 1 / 30;
    for (let left = seconds; left > 1e-6; left -= step) this.step(Math.min(step, left));
  }

  dispose(): void {
    if (typeof window !== "undefined") (window as unknown as { __victoryRooms?: Set<VictoryRoom> }).__victoryRooms?.delete(this);
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.resize?.disconnect();
    this.listeners.clear();
    this.lights.dispose();
    this.confetti.dispose();
    this.scene.remove(this.lights.object, this.confetti.object);
    disposeTree(this.scene);
    this.environment.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }

  private readonly draw = (now: number) => {
    this.frame = requestAnimationFrame(this.draw);
    this.step(Math.min(0.1, Math.max(0, (now - this.last) / 1000)));
    this.last = now;
    this.renderer.render(this.scene, this.camera);
  };

  private step(dt: number): void {
    this.time += dt;
    for (const listener of this.listeners) listener(dt, this.time);
    this.lights.update(this.time, dt);
    this.confetti.update(dt);
    this.orbit.update(dt);
  }

  private fit(): void {
    const width = Math.max(1, this.holder.clientWidth);
    const height = Math.max(1, this.holder.clientHeight);
    this.renderer.setPixelRatio(Math.min(this.options.maxDpr ?? 2, window.devicePixelRatio || 1));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
