import * as THREE from "three";

/** Badge height as a share of the screen's height, the same however far away the runner is. */
const SCREEN_HEIGHT = 0.034;
const PX = 64;

/**
 * A runner's number from the play card, in his card colour, floating
 * over his helmet: a round badge drawn once to a canvas and kept the same
 * size on screen. It sits above a name tag when he has one.
 */
export class PlayBadge {
  readonly sprite: THREE.Sprite;
  private readonly texture: THREE.CanvasTexture;
  private readonly material: THREE.SpriteMaterial;

  constructor(n: number, colour: string) {
    const canvas = document.createElement("canvas");
    canvas.width = PX;
    canvas.height = PX;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(PX / 2, PX / 2, PX / 2 - 3, 0, Math.PI * 2);
    ctx.fillStyle = colour;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(6,12,8,0.9)";
    ctx.stroke();
    ctx.fillStyle = "#08130c";
    ctx.font = "900 40px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(n), PX / 2, PX / 2 + 2);
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.material = new THREE.SpriteMaterial({ map: this.texture, sizeAttenuation: false, depthTest: false, transparent: true, toneMapped: false });
    this.sprite = new THREE.Sprite(this.material);
    this.sprite.renderOrder = 21;
  }

  /** Places it over the helmet top, lifted by `stack` badge heights (one for a name tag under it), at `opacity`. */
  place(top: THREE.Vector3, fovDegrees: number, stack: number, opacity: number): void {
    const f = 1 / Math.tan((fovDegrees * Math.PI) / 360);
    const size = (SCREEN_HEIGHT * 2) / f;
    this.sprite.scale.set(size, size, 1);
    // The sprite's centre sits below its picture, so it floats over the top by its own height and the stack.
    this.sprite.center.set(0.5, -0.25 - stack * 1.15);
    this.sprite.position.copy(top);
    this.material.opacity = opacity;
    this.sprite.visible = opacity > 0.02;
  }

  dispose(): void {
    this.texture.dispose();
    this.material.dispose();
  }
}
