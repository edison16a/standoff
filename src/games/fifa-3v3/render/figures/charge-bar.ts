import * as THREE from "three";
import { CHARGE } from "../../engine/charge";

/** Bar height as a share of the screen's height, the same however far away the player is. */
const SCREEN_HEIGHT = 0.016;
const W = 128;
const H = 20;

/**
 * The shot's charge bar over a player on the big screen, matching the
 * one on their phone: green, yellow and red zones uncovered from the
 * left as the bar fills. It is redrawn only when the level moves.
 */
export class ChargeSprite {
  readonly sprite: THREE.Sprite;
  private readonly canvas = document.createElement("canvas");
  private readonly texture: THREE.CanvasTexture;
  private drawn = -1;

  constructor() {
    this.canvas.width = W;
    this.canvas.height = H;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: this.texture, sizeAttenuation: false, depthTest: false, transparent: true });
    this.sprite = new THREE.Sprite(material);
    this.sprite.center.set(0.5, 0);
    this.sprite.renderOrder = 21;
    this.sprite.visible = false;
    this.fit(36);
  }

  /** Shows the bar at `level` (0 to 1), or hides it with null. */
  set(level: number | null): void {
    this.sprite.visible = level !== null;
    if (level === null) return;
    const q = Math.round(level * 64) / 64;
    if (q === this.drawn) return;
    this.drawn = q;
    this.draw(q);
  }

  fit(fovDegrees: number): void {
    const f = 1 / Math.tan((fovDegrees * Math.PI) / 360);
    const height = (SCREEN_HEIGHT * 2) / f;
    this.sprite.scale.set(height * (W / H), height, 1);
  }

  private draw(level: number): void {
    const ctx = this.canvas.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(8,10,20,0.75)";
    ctx.fillRect(0, 0, W, H);
    const inner = { x: 3, y: 3, w: W - 6, h: H - 6 };
    const zones: [number, number, string][] = [
      [0, CHARGE.yellow, "#22c55e"],
      [CHARGE.yellow, CHARGE.red, "#facc15"],
      [CHARGE.red, 1, "#ef4444"],
    ];
    for (const [from, to, colour] of zones) {
      const x0 = inner.x + inner.w * from;
      const x1 = inner.x + inner.w * Math.min(to, level);
      // The empty part of each zone shows faintly, the filled part in full.
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = colour;
      ctx.fillRect(x0, inner.y, inner.w * (to - from), inner.h);
      ctx.globalAlpha = 1;
      if (x1 > x0) ctx.fillRect(x0, inner.y, x1 - x0, inner.h);
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(inner.x + inner.w * level - 2, 0, 4, H);
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.texture.dispose();
    this.sprite.material.dispose();
  }
}
