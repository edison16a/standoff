import * as THREE from "three";
import { PITCH } from "../../engine/tuning";

const ADS = [
  { text: "STANDOFF", bg: "#12081f", fg: "#c084fc" },
  { text: "3V3 NIGHT LEAGUE", bg: "#041a14", fg: "#34d399" },
  { text: "SCAN TO PLAY", bg: "#1a0b05", fg: "#fbbf24" },
  { text: "FIRST TO FIVE", bg: "#050d1f", fg: "#60a5fa" },
] as const;
/** One ad panel is this many metres long on the boards. */
const PANEL_M = 4;
const PANEL_PX = 512;

/**
 * The LED boards round the pitch. They scroll their ads gently and,
 * when a goal goes in, flash GOAL in the scorer's colour all round.
 */
export class Boards {
  readonly group = new THREE.Group();
  private readonly canvas = document.createElement("canvas");
  private readonly texture: THREE.CanvasTexture;
  private readonly body = new THREE.MeshStandardMaterial({ color: "#16181f", roughness: 0.6, metalness: 0.2 });
  /** Each board's lit face, with its own copy of the texture so it can repeat to its length. */
  private readonly screens: THREE.MeshBasicMaterial[] = [];
  private readonly meshes: THREE.Mesh[] = [];
  private flashFor = 0;
  private scroll = 0;

  constructor() {
    this.canvas.width = PANEL_PX * ADS.length;
    this.canvas.height = 128;
    this.drawAds();
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.wrapS = THREE.RepeatWrapping;
    const HL = PITCH.halfLength;
    const HW = PITCH.halfWidth;
    const H = PITCH.boardHeight;
    const T = 0.14;
    const gap = PITCH.goalHalfWidth + PITCH.postRadius + 0.02;
    // Box faces are +x, -x, +y, -y, +z, -z: each board lights the one facing the pitch.
    this.add(2 * HL + 2 * T, H, T, 0, -HW - T / 2, 4);
    this.add(2 * HL + 2 * T, H, T, 0, HW + T / 2, 5);
    for (const end of [-1, 1]) {
      const length = HW - gap;
      for (const side of [-1, 1]) this.add(T, H, length, end * (HL + T / 2), side * (gap + length / 2), end < 0 ? 0 : 1);
    }
  }

  private add(w: number, h: number, d: number, x: number, z: number, face: number): void {
    const map = this.texture.clone();
    map.repeat.set(Math.max(w, d) / (PANEL_M * ADS.length), 1);
    const screen = new THREE.MeshBasicMaterial({ map, toneMapped: false });
    this.screens.push(screen);
    const materials: THREE.Material[] = [];
    for (let i = 0; i < 6; i++) materials.push(i === face ? screen : this.body);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materials);
    mesh.position.set(x, h / 2, z);
    mesh.receiveShadow = true;
    this.group.add(mesh);
    this.meshes.push(mesh);
  }

  private drawAds(): void {
    const ctx = this.canvas.getContext("2d")!;
    ADS.forEach((ad, i) => panel(ctx, i, ad.text, ad.bg, ad.fg));
  }

  /** GOAL in the scorer's colour on every board for a few seconds. */
  flash(colour: string, text = "GOAL"): void {
    this.flashFor = 5;
    const ctx = this.canvas.getContext("2d")!;
    for (let i = 0; i < ADS.length; i++) panel(ctx, i, text, "#050505", colour);
    this.refresh();
  }

  update(dt: number, time: number): void {
    this.scroll += dt * 0.03;
    let brightness = 1;
    if (this.flashFor > 0) {
      this.flashFor -= dt;
      brightness = Math.sin(time * 14) > -0.3 ? 1 : 0.45;
      if (this.flashFor <= 0) {
        this.drawAds();
        this.refresh();
        brightness = 1;
      }
    }
    for (const screen of this.screens) {
      screen.color.setScalar(brightness);
      if (screen.map) screen.map.offset.x = this.scroll;
    }
  }

  private refresh(): void {
    for (const screen of this.screens) if (screen.map) screen.map.needsUpdate = true;
  }

  dispose(): void {
    for (const mesh of this.meshes) mesh.geometry.dispose();
    for (const screen of this.screens) {
      screen.map?.dispose();
      screen.dispose();
    }
    this.body.dispose();
    this.texture.dispose();
  }
}

function panel(ctx: CanvasRenderingContext2D, i: number, text: string, bg: string, fg: string): void {
  const x = i * PANEL_PX;
  ctx.fillStyle = bg;
  ctx.fillRect(x, 0, PANEL_PX, 128);
  ctx.fillStyle = fg;
  ctx.fillRect(x, 0, PANEL_PX, 6);
  ctx.fillRect(x, 122, PANEL_PX, 6);
  ctx.font = "900 62px Arial Black, Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = fg;
  ctx.shadowBlur = 18;
  ctx.fillText(text, x + PANEL_PX / 2, 66, PANEL_PX - 40);
  ctx.shadowBlur = 0;
}
