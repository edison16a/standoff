import * as THREE from "three";

/** Tag height as a share of the view's height, the same however far away the fighter is. */
const SCREEN_HEIGHT = 0.03;
const PILL_PX = 56;
const BAR_PX = 10;

/**
 * A name tag over a fighter: their name in their own colour on a dark
 * pill edged with their team's colour, and a health bar under it. It
 * keeps its size on screen at any distance, like a broadcast graphic.
 */
export class NameTag {
  readonly group = new THREE.Group();
  private readonly pill: THREE.Sprite;
  private readonly back: THREE.Sprite;
  private readonly fill: THREE.Sprite;
  private readonly texture: THREE.CanvasTexture;
  private readonly aspect: number;
  private health = 1;
  private scale = 1;

  constructor(name: string, colour: string, team: string) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const font = "800 36px Arial, Helvetica, sans-serif";
    ctx.font = font;
    const width = Math.ceil(ctx.measureText(name).width) + 56;
    canvas.width = width;
    canvas.height = PILL_PX;
    ctx.font = font;
    ctx.fillStyle = "rgba(10,10,18,0.78)";
    roundRect(ctx, 2, 2, width - 4, PILL_PX - 4, 14);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = team;
    roundRect(ctx, 2, 2, width - 4, PILL_PX - 4, 14);
    ctx.stroke();
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(24, PILL_PX / 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.textBaseline = "middle";
    ctx.fillText(name, 40, PILL_PX / 2 + 2);
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.aspect = width / PILL_PX;
    const sprite = (map: THREE.Texture | null, hex: string, opacity = 1) => {
      const mat = new THREE.SpriteMaterial({ map, color: hex, sizeAttenuation: false, depthTest: false, depthWrite: false, transparent: true, opacity });
      const s = new THREE.Sprite(mat);
      s.renderOrder = 30;
      return s;
    };
    this.pill = sprite(this.texture, "#ffffff");
    this.pill.center.set(0.5, 0);
    this.back = sprite(null, "#0a0a12", 0.7);
    this.fill = sprite(null, colour);
    this.back.center.set(0.5, 1);
    this.fill.center.set(0, 1);
    this.fill.renderOrder = 31;
    this.group.add(this.pill, this.back, this.fill);
  }

  /** Keeps the tag the same size on screen for the camera's field of view. */
  fit(fovDegrees: number): void {
    const f = 1 / Math.tan((fovDegrees * Math.PI) / 360);
    this.scale = (SCREEN_HEIGHT * 2) / f;
    this.layout();
  }

  setHealth(share: number): void {
    const h = Math.max(0, Math.min(1, share));
    if (Math.abs(h - this.health) < 1e-3) return;
    this.health = h;
    this.layout();
  }

  private layout(): void {
    const h = this.scale;
    const w = h * this.aspect;
    this.pill.scale.set(w, h, 1);
    const barH = h * (BAR_PX / PILL_PX);
    const barW = w * 0.8;
    this.back.scale.set(barW, barH, 1);
    this.fill.scale.set(Math.max(1e-4, barW * this.health), barH, 1);
    // The bar hangs just under the pill; sprites that ignore distance are placed in screen units too.
    this.back.center.set(0.5, 1.4);
    this.fill.center.set(0.5 / Math.max(1e-4, this.health), 1.4);
    this.fill.visible = this.health > 0;
  }

  dispose(): void {
    this.texture.dispose();
    for (const s of [this.pill, this.back, this.fill]) s.material.dispose();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
