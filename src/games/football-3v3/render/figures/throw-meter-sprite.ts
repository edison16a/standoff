import * as THREE from "three";
import type { MatchView } from "../../engine/view";
import type { PassGrade } from "../../engine/pass-meter";
import type { Squad } from "./squad";

/** The meter's height as a share of the screen's height, the same however far away the QB is. */
const SCREEN_HEIGHT = 0.15;
const W = 168;
const H = 300;
/** The bar on the canvas: its left edge, width, top and bottom. */
const BAR = { x: 69, w: 30, top: 64, bottom: 292 } as const;

const WORDS: Record<PassGrade, string> = { perfect: "PERFECT", good: "GOOD", weak: "WEAK", hot: "TOO HOT" };
const COLOURS: Record<PassGrade, string> = { perfect: "#fde047", good: "#4ade80", weak: "#f87171", hot: "#f87171" };

const at = new THREE.Vector3();

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/**
 * The throw meter on the big screen, beside the QB: the same bar the
 * phone shows, with the green band, its gold heart and the marker
 * climbing while the throw is held. On the release the marker stops and
 * a word above says how it came out. Drawn over the graded picture so
 * its colours read exactly, and kept the same size on screen.
 */
export class ThrowMeterSprite {
  readonly sprite: THREE.Sprite;
  private readonly canvas = document.createElement("canvas");
  private readonly texture: THREE.CanvasTexture;
  private drawn = "";

  constructor() {
    this.canvas.width = W;
    this.canvas.height = H;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: this.texture, sizeAttenuation: false, depthTest: false, transparent: true, toneMapped: false });
    this.sprite = new THREE.Sprite(material);
    // Hung to the right of the QB's shoulder, its middle at his chest.
    this.sprite.center.set(-0.05, 0.45);
    this.sprite.renderOrder = 21;
    this.sprite.visible = false;
  }

  update(view: MatchView, squad: Squad, fov: number, shown = true): void {
    const m = view.meter;
    const figure = m ? squad.figure(m.id) : null;
    if (!shown || !m || !figure || view.phase === "over") {
      this.sprite.visible = false;
      return;
    }
    figure.top(at);
    at.y -= 0.7;
    this.sprite.position.copy(at);
    const f = 1 / Math.tan((fov * Math.PI) / 360);
    const size = (SCREEN_HEIGHT * 2) / f;
    this.sprite.scale.set(size * (W / H), size, 1);
    this.sprite.material.opacity = m.fade;
    this.sprite.visible = m.fade > 0.01;
    const key = `${m.level.toFixed(3)}|${m.grade}|${m.window.green}`;
    if (key !== this.drawn) {
      this.drawn = key;
      this.draw(m.level, m.window, m.grade);
    }
  }

  private draw(level: number, window: { center: number; green: number; gold: number }, grade: PassGrade | null): void {
    const ctx = this.canvas.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);
    const span = BAR.bottom - BAR.top;
    const y = (v: number) => BAR.bottom - v * span;
    // The bar: a dark well in a light frame.
    ctx.fillStyle = "rgba(8,10,20,0.82)";
    rounded(ctx, BAR.x - 6, BAR.top - 6, BAR.w + 12, span + 12, 12);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.stroke();
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(BAR.x, y(window.center + window.green), BAR.w, window.green * 2 * span);
    ctx.fillStyle = "#fde047";
    ctx.fillRect(BAR.x, y(window.center + window.gold), BAR.w, Math.max(4, window.gold * 2 * span));
    // The marker, wider than the bar so it reads at a glance.
    const my = y(level);
    ctx.fillStyle = grade ? COLOURS[grade] : "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 6;
    rounded(ctx, BAR.x - 14, my - 4, BAR.w + 28, 8, 4);
    ctx.fill();
    ctx.shadowBlur = 0;
    this.texture.needsUpdate = true;
    if (!grade) return;
    ctx.font = "900 26px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(8,10,20,0.9)";
    ctx.strokeText(WORDS[grade], W / 2, 28);
    ctx.fillStyle = COLOURS[grade];
    ctx.fillText(WORDS[grade], W / 2, 28);
  }

  dispose(): void {
    this.texture.dispose();
    this.sprite.material.dispose();
  }
}
