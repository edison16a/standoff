import * as THREE from "three";
import { TEAMS } from "../../roster";
import { Bake, tube } from "./bake";
import { ledMaterial } from "./led-boards";

/** Where the scoreboard hangs: over the top of the half court, high enough to clear every lob. */
export const JUMBOTRON = { x: 0, y: 11.4, z: 9, width: 5.2, height: 3.2, depth: 3.8 } as const;

/** Paints the score screen: the two teams in their colours with their points, and the race to 11 under them. */
function paint(ctx: CanvasRenderingContext2D, score: readonly [number, number]): void {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0b1024");
  bg.addColorStop(1, "#04060f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  TEAMS.forEach((team, i) => {
    const x = i === 0 ? 0 : W / 2;
    ctx.fillStyle = team.color;
    ctx.fillRect(x + 16, 16, W / 2 - 32, 86);
    ctx.fillStyle = "#ffffff";
    ctx.font = 'italic 900 64px Impact, "Arial Black", sans-serif';
    ctx.fillText(team.name.toUpperCase(), x + W / 4, 62);
    ctx.font = '900 230px Impact, "Arial Black", sans-serif';
    ctx.fillText(String(score[i] ?? 0), x + W / 4, 250);
  });
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(W / 2 - 2, 120, 4, 250);
  ctx.fillStyle = "#facc15";
  ctx.font = 'italic 900 58px Impact, "Arial Black", sans-serif';
  ctx.fillText("FIRST TO 11", W / 2, 430);
}

/**
 * The centre hung scoreboard: a black frame with a big screen on each
 * end and a narrower one on each side, all showing the live score, a
 * scrolling LED band round its foot, and the cables up to the roof. It
 * repaints only when the score changes.
 */
export class Jumbotron {
  readonly group = new THREE.Group();
  /** The parts that carry words, which the showcase's wordless films hide. */
  readonly screens = new THREE.Group();
  private readonly canvas = document.createElement("canvas");
  private readonly texture: THREE.CanvasTexture;
  private readonly owned: THREE.Material[] = [];
  private shown = "";

  constructor(ribbon: THREE.Texture) {
    const J = JUMBOTRON;
    this.canvas.width = 1024;
    this.canvas.height = 512;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.show([0, 0]);
    const frame = new THREE.MeshStandardMaterial({ color: "#0d0f15", roughness: 0.45, metalness: 0.6 });
    const big = ledMaterial(this.texture, J.width, J.height - 0.3, 1.5);
    const side = ledMaterial(this.texture, J.depth, J.height - 0.3, 1.5);
    const band = ledMaterial(ribbon, 2 * (J.width + J.depth) * 0.8, 0.45, 1.6);
    this.owned.push(frame, big, side, band);
    const body = new Bake();
    body.add(new THREE.BoxGeometry(J.width + 0.2, J.height + 0.2, J.depth + 0.2), frame);
    // The foot: a narrower box under the screens with the LED band round it.
    body.add(new THREE.BoxGeometry(J.width * 0.8, 0.6, J.depth * 0.8), frame, { y: -J.height / 2 - 0.35 });
    body.add(new THREE.BoxGeometry(J.width + 0.4, 0.18, J.depth + 0.4), frame, { y: J.height / 2 + 0.18 });
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      body.add(tube(new THREE.Vector3(x * J.width * 0.4, J.height / 2, z * J.depth * 0.4), new THREE.Vector3(x * J.width * 0.2, 12, z * J.depth * 0.2), 0.03, 5), frame);
    }
    const screens = new Bake();
    const half = { w: J.width / 2 + 0.101, d: J.depth / 2 + 0.101 };
    screens.add(new THREE.PlaneGeometry(J.width - 0.1, J.height - 0.3), big, { z: half.d });
    screens.add(new THREE.PlaneGeometry(J.width - 0.1, J.height - 0.3), big, { z: -half.d, ry: Math.PI });
    screens.add(new THREE.PlaneGeometry(J.depth - 0.1, J.height - 0.3), side, { x: half.w, ry: Math.PI / 2 });
    screens.add(new THREE.PlaneGeometry(J.depth - 0.1, J.height - 0.3), side, { x: -half.w, ry: -Math.PI / 2 });
    const foot = { y: -J.height / 2 - 0.35, w: J.width * 0.4 + 0.005, d: J.depth * 0.4 + 0.005 };
    screens.add(new THREE.PlaneGeometry(J.width * 0.8, 0.45), band, { y: foot.y, z: foot.d });
    screens.add(new THREE.PlaneGeometry(J.width * 0.8, 0.45), band, { y: foot.y, z: -foot.d, ry: Math.PI });
    screens.add(new THREE.PlaneGeometry(J.depth * 0.8, 0.45), band, { y: foot.y, x: foot.w, ry: Math.PI / 2 });
    screens.add(new THREE.PlaneGeometry(J.depth * 0.8, 0.45), band, { y: foot.y, x: -foot.w, ry: -Math.PI / 2 });
    this.group.add(...body.build(false));
    this.screens.add(...screens.build(false));
    this.group.add(this.screens);
    this.group.position.set(J.x, J.y, J.z);
  }

  /** Shows the score; repaints only when it changed. */
  show(score: readonly [number, number]): void {
    const key = `${score[0]}:${score[1]}`;
    if (key === this.shown) return;
    this.shown = key;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;
    paint(ctx, score);
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.texture.dispose();
    for (const m of this.owned) m.dispose();
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
  }
}
