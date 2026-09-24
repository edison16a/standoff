import {
  ACESFilmicToneMapping,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
} from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { HALF_HEIGHT } from "../engine/tuning";
import { paintWood } from "./textures/wood";

/** Vertical field of view. Narrow, so fruit keeps its shape near the edges. */
const FOV = 36;
/** How far behind the flight plane the board lies. The gap is what throws the shadows aside, as on the cover. */
export const BOARD_DEPTH = 3.2;
const BOARD_SIZE = { w: 34, h: 13.5 };

/**
 * Quality steps, best first. A machine that cannot keep up gives up the
 * bloom first, then resolution and shadow detail, which the eye misses
 * least on a busy screen.
 */
const QUALITY = [
  { bloom: true, scale: 1, shadow: 2048 },
  { bloom: false, scale: 1, shadow: 2048 },
  { bloom: false, scale: 0.75, shadow: 1024 },
  { bloom: false, scale: 0.55, shadow: 1024 },
  { bloom: false, scale: 0.4, shadow: 512 },
] as const;

/**
 * The scene everything is drawn in. The camera looks straight down at a
 * wooden board; fruit flies in a plane a little above it, so the plane
 * z = 0 fills the screen exactly and a screen point maps straight to a
 * world point. A warm key light from the top left throws soft shadows
 * down and right onto the wood, and a light bloom makes blades and
 * sparks glow.
 */
export class Stage {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly key: DirectionalLight;
  /** Half the width of the flight plane in world units. */
  halfWidth = HALF_HEIGHT * (16 / 9);
  /** Device pixels per world unit at the flight plane's distance, for sizing point sprites. */
  pointScale = 100;
  private quality = 0;
  private size = { width: 1, height: 1, dpr: 1 };

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;

    const distance = HALF_HEIGHT / Math.tan(((FOV / 2) * Math.PI) / 180);
    this.camera = new PerspectiveCamera(FOV, 16 / 9, 1, 60);
    this.camera.position.set(0, 0, distance);

    const pmrem = new PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.4;
    pmrem.dispose();

    this.scene.add(new HemisphereLight(0xfff1dc, 0x5a3418, 0.55));
    this.key = new DirectionalLight(0xfff0d8, 3.2);
    this.key.position.set(-7, 9, 16);
    this.key.target.position.set(0, 0, -BOARD_DEPTH);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    const shadowCam = this.key.shadow.camera;
    shadowCam.left = -17;
    shadowCam.right = 17;
    shadowCam.top = 10;
    shadowCam.bottom = -10;
    shadowCam.near = 1;
    shadowCam.far = 45;
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.03;
    this.key.shadow.radius = 3;
    this.key.shadow.blurSamples = 12;
    this.scene.add(this.key, this.key.target);

    const wood = paintWood();
    const board = new Mesh(
      new PlaneGeometry(BOARD_SIZE.w, BOARD_SIZE.h),
      new MeshStandardMaterial({ map: wood.map, bumpMap: wood.bump, bumpScale: 2.2, roughness: 0.66, metalness: 0 }),
    );
    board.position.z = -BOARD_DEPTH;
    board.receiveShadow = true;
    this.scene.add(board);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new Vector2(512, 512), 0.7, 0.4, 1.0);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  resize(width: number, height: number, dpr: number): void {
    this.size = { width, height, dpr };
    // Past 1.5 device pixels per CSS pixel the extra sharpness costs more frame time than it is worth.
    const ratio = Math.min(dpr, 1.5) * QUALITY[this.quality]!.scale;
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    this.composer.setPixelRatio(ratio);
    this.composer.setSize(width, height);
    this.bloom.resolution.set((width * ratio) / 2, (height * ratio) / 2);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.halfWidth = HALF_HEIGHT * this.camera.aspect;
    this.pointScale = (height * ratio) / (2 * HALF_HEIGHT);
  }

  /** Steps down one quality level. Returns false when already at the lowest. */
  lowerQuality(): boolean {
    if (this.quality >= QUALITY.length - 1) return false;
    this.quality += 1;
    const shadow = QUALITY[this.quality]!.shadow;
    if (this.key.shadow.mapSize.x !== shadow) {
      this.key.shadow.mapSize.set(shadow, shadow);
      this.key.shadow.map?.dispose();
      this.key.shadow.map = null;
    }
    this.resize(this.size.width, this.size.height, this.size.dpr);
    return true;
  }

  render(): void {
    if (QUALITY[this.quality]!.bloom) this.composer.render();
    else {
      this.renderer.toneMapping = ACESFilmicToneMapping;
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose(): void {
    this.composer.dispose();
    this.renderer.dispose();
    // Browsers allow only a few live WebGL contexts, so give this one back now rather than on garbage collection.
    this.renderer.forceContextLoss();
  }
}
