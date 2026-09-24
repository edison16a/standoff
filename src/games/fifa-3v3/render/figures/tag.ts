import * as THREE from "three";

/** Tag height as a share of the screen's height, the same however far away the player is. */
const SCREEN_HEIGHT = 0.034;
/** The pill's height on the canvas; the pointer below it is extra. */
const PILL_PX = 52;

/**
 * A name tag floating over a player: the name on a dark pill with a bar
 * in their colour, drawn once to a canvas. Phones' players get a bright
 * tag and a pointer; computer players a quieter one.
 */
export class NameTag {
  readonly sprite: THREE.Sprite;
  private readonly texture: THREE.CanvasTexture;
  private readonly aspect: number;
  private readonly canvasHeight: number;

  constructor(name: string, colour: string, human: boolean) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const font = `${human ? 800 : 700} 34px Arial, Helvetica, sans-serif`;
    ctx.font = font;
    const text = name.toUpperCase();
    const width = Math.ceil(ctx.measureText(text).width) + 58;
    canvas.width = width;
    canvas.height = human ? 72 : 56;
    ctx.font = font;
    const h = PILL_PX;
    ctx.fillStyle = human ? "rgba(8,10,20,0.82)" : "rgba(8,10,20,0.55)";
    roundRect(ctx, 2, 2, width - 4, h - 4, 12);
    ctx.fill();
    ctx.fillStyle = colour;
    roundRect(ctx, 2, 2, 14, h - 4, 7);
    ctx.fill();
    if (human) {
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
    }
    ctx.fillStyle = human ? "#ffffff" : "rgba(255,255,255,0.82)";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 30, h / 2 + 1);
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: this.texture, sizeAttenuation: false, depthTest: false, transparent: true });
    this.sprite = new THREE.Sprite(material);
    this.sprite.center.set(0.5, 0);
    this.sprite.renderOrder = 20;
    this.aspect = canvas.width / canvas.height;
    this.canvasHeight = canvas.height;
    this.fit(36);
  }

  /** Keeps the tag the same size on screen for the camera's field of view. */
  fit(fovDegrees: number): void {
    // A sprite that ignores distance is sized in screen units scaled by the lens.
    const f = 1 / Math.tan((fovDegrees * Math.PI) / 360);
    const pill = (SCREEN_HEIGHT * 2) / f;
    const height = pill * (this.canvasHeight / PILL_PX);
    this.sprite.scale.set(height * this.aspect, height, 1);
  }

  dispose(): void {
    this.texture.dispose();
    this.sprite.material.dispose();
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
