import * as THREE from "three";

/** Tag height as a share of the screen's height, the same however far away the player is. */
const SCREEN_HEIGHT = 0.032;
/** The pill's height on the canvas; the pointer below it is extra. */
const PILL_PX = 52;
const FONT = "800 34px Arial, Helvetica, sans-serif";
/** The stamina strip along the pill's foot, under the name. */
const STRIP = { y: 42, h: 5 } as const;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Green while the legs are fresh, amber, then red when spent: the phone's bar in the same colours. */
const stripColour = (stamina: number) => (stamina > 0.55 ? "#22c55e" : stamina > 0.25 ? "#f59e0b" : "#ef4444");

/**
 * A name tag floating over a phone's player: the name on a dark pill
 * edged in the player's colour, with a pointer down to the helmet. A
 * thin strip along the pill's foot shows his stamina once he has used
 * some, and is gone again on fresh legs. It is drawn to a canvas, redrawn
 * only when the strip changes, and kept the same size on screen.
 */
export class NameTag {
  readonly sprite: THREE.Sprite;
  private readonly texture: THREE.CanvasTexture;
  private readonly canvas: HTMLCanvasElement;
  private readonly aspect: number;
  private readonly height: number;
  private readonly text: string;
  /** The strip as drawn, in twentieths, or -1 for none. */
  private shown = -1;

  constructor(name: string, private readonly colour: string) {
    this.canvas = document.createElement("canvas");
    const ctx = this.canvas.getContext("2d")!;
    ctx.font = FONT;
    this.text = name.toUpperCase();
    this.canvas.width = Math.ceil(ctx.measureText(this.text).width) + 58;
    this.canvas.height = 72;
    this.draw(-1);
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: this.texture, sizeAttenuation: false, depthTest: false, transparent: true, toneMapped: false });
    this.sprite = new THREE.Sprite(material);
    this.sprite.center.set(0.5, 0);
    this.sprite.renderOrder = 20;
    this.aspect = this.canvas.width / this.canvas.height;
    this.height = this.canvas.height;
  }

  /** Shows his stamina, 1 fresh to 0 spent. Fresh legs hide the strip, so a rested field stays clean. */
  setStamina(stamina: number): void {
    const step = stamina >= 0.97 ? -1 : Math.round(stamina * 20);
    if (step === this.shown) return;
    this.draw(step);
    this.texture.needsUpdate = true;
  }

  private draw(step: number): void {
    this.shown = step;
    const ctx = this.canvas.getContext("2d")!;
    const width = this.canvas.width;
    const h = PILL_PX;
    ctx.clearRect(0, 0, width, this.canvas.height);
    ctx.font = FONT;
    ctx.fillStyle = "rgba(8,10,20,0.82)";
    roundRect(ctx, 2, 2, width - 4, h - 4, 12);
    ctx.fill();
    ctx.fillStyle = this.colour;
    roundRect(ctx, 2, 2, 14, h - 4, 7);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.colour;
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
    // With the strip showing, the name rides a little higher to make room under it.
    ctx.fillText(this.text, 30, step < 0 ? h / 2 + 1 : h / 2 - 3);
    if (step < 0) return;
    const left = 30;
    const span = width - left - 16;
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    roundRect(ctx, left, STRIP.y, span, STRIP.h, 2.5);
    ctx.fill();
    ctx.fillStyle = stripColour(step / 20);
    roundRect(ctx, left, STRIP.y, Math.max(STRIP.h, (span * step) / 20), STRIP.h, 2.5);
    ctx.fill();
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
