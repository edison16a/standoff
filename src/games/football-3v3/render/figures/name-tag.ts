import * as THREE from "three";

/** Tag height as a share of the screen's height, the same however far away the player is. */
const SCREEN_HEIGHT = 0.032;
/** The pill's height on the canvas; the pointer below it is extra. */
const PILL_PX = 52;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * A name tag floating over a phone's player: the name on a dark pill
 * edged in the player's colour, with a pointer down to the helmet. It is
 * drawn once to a canvas and kept the same size on screen.
 */
export class NameTag {
  readonly sprite: THREE.Sprite;
  private readonly texture: THREE.CanvasTexture;
  private readonly aspect: number;
  private readonly height: number;

  constructor(name: string, colour: string) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const font = "800 34px Arial, Helvetica, sans-serif";
    ctx.font = font;
    const text = name.toUpperCase();
    const width = Math.ceil(ctx.measureText(text).width) + 58;
    canvas.width = width;
    canvas.height = 72;
    ctx.font = font;
    const h = PILL_PX;
    ctx.fillStyle = "rgba(8,10,20,0.82)";
    roundRect(ctx, 2, 2, width - 4, h - 4, 12);
    ctx.fill();
    ctx.fillStyle = colour;
    roundRect(ctx, 2, 2, 14, h - 4, 7);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = colour;
    roundRect(ctx, 2, 2, width - 4, h - 4, 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width / 2 - 11, h - 2);
    ctx.lineTo(width / 2 + 11, h - 2);
    ctx.lineTo(width / 2, h + 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 30, h / 2 + 1);
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: this.texture, sizeAttenuation: false, depthTest: false, transparent: true });
    this.sprite = new THREE.Sprite(material);
    this.sprite.center.set(0.5, 0);
    this.sprite.renderOrder = 20;
    this.aspect = canvas.width / canvas.height;
    this.height = canvas.height;
  }

  /** Keeps the tag the same size on screen for the camera's field of view. */
  fit(fovDegrees: number): void {
    const f = 1 / Math.tan((fovDegrees * Math.PI) / 360);
    const size = ((SCREEN_HEIGHT * 2) / f) * (this.height / PILL_PX);
    this.sprite.scale.set(size * this.aspect, size, 1);
  }

  dispose(): void {
    this.texture.dispose();
    this.sprite.material.dispose();
  }
}
