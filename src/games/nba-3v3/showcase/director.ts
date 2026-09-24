import * as THREE from "three";
import type { ShowcaseView } from "@/platform/games/game-api";
import { STEP } from "../engine/tuning";
import { CourtRenderer } from "../render/court-renderer";
import { HighlightScript } from "./script";

/**
 * How far into the highlight each view starts. The capture tool lets
 * every view run three seconds before it shoots, so the poster and the
 * icon start late enough to land on the dunk, and the loop starts early
 * so its eight seconds hold the dunk and the three.
 */
const LEAD: Record<ShowcaseView, number> = { loop: -0.4, poster: 0.85, icon: 0.85 };

/** The icon's hero angle: low under the rim, looking up at the dunk. */
const ICON_CAMERA = { pos: new THREE.Vector3(1.9, 1.35, 5.4), look: new THREE.Vector3(-0.35, 2.75, 1.7), fov: 48 };

/**
 * Runs the showcase: the scripted highlight stepped at the engine's
 * fixed rate from performance.now, slowed for the dunk, and drawn by
 * the real renderer through the broadcast camera.
 */
export class ShowcaseDirector {
  private readonly renderer: CourtRenderer;
  private readonly script: HighlightScript;
  private last = -1;
  private carry = 0;
  private elapsed = 0;
  private slowLeft = 0;
  private slowScale = 1;

  private readonly skipDraw: boolean;

  constructor(canvas: HTMLCanvasElement, readonly view: ShowcaseView) {
    // Development aids: ?off=aa,shadows,env,crowd turns rendering features off, ?skip=draw steps without drawing.
    const params = new URLSearchParams(window.location.search);
    const off = (params.get("off") ?? "").split(",");
    this.skipDraw = params.get("skip") === "draw";
    this.renderer = new CourtRenderer(canvas, { antialias: !off.includes("aa"), shadows: !off.includes("shadows"), reflections: !off.includes("env") });
    if (off.includes("crowd")) this.renderer.arena.crowd.group.visible = false;
    this.script = new HighlightScript(LEAD[view]);
    this.renderer.setMatch(this.script.match);
    if (view === "icon") this.renderer.tv.fixed = ICON_CAMERA;
    // A development aid: ?cam=x,y,z,lookX,lookY,lookZ,fov pins the camera for close looks at the models.
    const cam = params.get("cam");
    if (cam) {
      const [x = 0, y = 0, z = 0, lx = 0, ly = 0, lz = 0, fov = 40] = cam.split(",").map(Number);
      this.renderer.tv.fixed = { pos: new THREE.Vector3(x, y, z), look: new THREE.Vector3(lx, ly, lz), fov };
    }
  }

  resize(width: number, height: number, dpr: number): void {
    this.renderer.resize(width, height, dpr);
  }

  frame(now: number): void {
    const real = this.last < 0 ? STEP : Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    const scale = this.slowLeft > 0 ? this.slowScale : 1;
    this.slowLeft = Math.max(0, this.slowLeft - real);
    const dt = real * scale;
    this.carry += dt;
    const m = this.script.match;
    while (this.carry >= STEP) {
      this.carry -= STEP;
      this.elapsed += STEP;
      this.script.steer(this.elapsed);
      m.step(STEP);
      for (const e of m.drainEvents()) {
        this.renderer.onEvent(e);
        const slow = this.script.slowFor(e);
        if (slow) {
          this.slowScale = slow.scale;
          this.slowLeft = slow.seconds;
        }
      }
    }
    if (!this.skipDraw) this.renderer.render(dt);
  }

  dispose(): void {
    this.renderer.dispose();
  }
}
