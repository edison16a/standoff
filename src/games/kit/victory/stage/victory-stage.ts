import * as THREE from "three";
import { OrbitCamera } from "../camera/orbit-camera";
import type { OrbitShot } from "../camera/orbit";
import { VictoryConfetti, type ConfettiOptions } from "../confetti/confetti";
import { StageLights } from "../lights/stage-lights";
import { studioEnvironment } from "./studio-environment";

export interface VictoryStageOptions {
  /** The camera's move round the winners. */
  shot: OrbitShot;
  background?: THREE.ColorRepresentation;
  /** The floor's colour. It is glossy, so the lights pool on it. */
  floor?: THREE.ColorRepresentation;
  confetti?: ConfettiOptions;
  fov?: number;
  /** Keeps the last frame for screenshots and media capture. */
  preserve?: boolean;
}

/**
 * A ready made victory scene on its own canvas, for games whose results
 * sit apart from their play: a dark stage with a glossy floor, soft
 * studio reflections for the metal, spotlights, confetti and the orbit
 * camera. Add the winners and trophies to `scene`, then `start`.
 *
 *   const stage = new VictoryStage(canvas, { shot: { centre: { x: 0, z: 0 }, radius: 6, height: 2.4, lookHeight: 1.4 } });
 *   stage.scene.add(podium.group);
 *   stage.lights.addSpot({ from: { x: 0, y: 9, z: 3 }, at: { x: 0, y: 0, z: 0 } });
 *   stage.confetti.shower({ centre: { x: 0, y: 0, z: 0 }, radius: 4, height: 6, count: 1500 });
 *   stage.start((dt, time) => spinTrophy(dt));
 *   stage.dispose();   // on unmount
 */
export class VictoryStage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly orbit: OrbitCamera;
  readonly lights = new StageLights();
  readonly confetti: VictoryConfetti;
  private readonly environment: THREE.Texture;
  private readonly floor: THREE.Mesh;
  private frame = 0;
  private last = 0;
  private time = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    options: VictoryStageOptions,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: !!options.preserve });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    const background = new THREE.Color(options.background ?? "#07070d");
    this.scene.background = background;
    this.scene.fog = new THREE.Fog(background, 16, 40);
    this.environment = studioEnvironment(this.renderer);
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = 1;
    this.scene.add(new THREE.HemisphereLight("#8fa4ff", "#140c06", 0.5));
    this.floor = new THREE.Mesh(
      new THREE.CircleGeometry(30, 64),
      new THREE.MeshPhongMaterial({ color: options.floor ?? "#1a1a24", shininess: 40, specular: "#2a2a30" }),
    );
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor, this.lights.group);
    this.confetti = new VictoryConfetti(options.confetti);
    this.scene.add(this.confetti.group);
    this.camera = new THREE.PerspectiveCamera(options.fov ?? 38, 16 / 9, 0.1, 120);
    this.orbit = new OrbitCamera(this.camera, options.shot);
  }

  /** Runs the scene every animation frame, calling `onFrame` first. Seconds for both. */
  start(onFrame?: (dt: number, time: number) => void): void {
    cancelAnimationFrame(this.frame);
    const loop = (now: number) => {
      const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 1 / 60;
      this.last = now;
      this.time += dt;
      onFrame?.(dt, this.time);
      this.step(dt);
      this.frame = requestAnimationFrame(loop);
    };
    this.frame = requestAnimationFrame(loop);
  }

  /** One frame by hand, for tests and captures that step the clock themselves. */
  step(dt: number): void {
    this.fit();
    this.orbit.update(dt);
    this.lights.update(dt, this.orbit.time);
    this.confetti.update(dt, this.orbit.time);
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.confetti.dispose();
    this.lights.dispose();
    this.floor.geometry.dispose();
    (this.floor.material as THREE.Material).dispose();
    this.environment.dispose();
    this.renderer.dispose();
  }

  private fit(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (!width || !height) return;
    const size = this.renderer.getSize(new THREE.Vector2());
    if (size.x === width && size.y === height) return;
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
