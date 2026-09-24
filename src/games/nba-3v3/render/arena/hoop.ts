import * as THREE from "three";
import { BOARD, RIM } from "../../engine/tuning";
import { Net } from "./net";

const PAD = "#1d4ed8";
const STEEL = "#20242e";

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, shadow = true): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = shadow;
  return m;
}

/**
 * The basket: a padded stanchion behind the baseline, the arm out to a
 * glass backboard with its frame, square and edge lights, the orange rim
 * on its bracket, the net, and the shot clock box on top showing the
 * real seconds. The rim shakes when it is hit or dunked on.
 */
export class Hoop {
  readonly group = new THREE.Group();
  readonly net = new Net();
  private readonly rim = new THREE.Group();
  private readonly edgeMat: THREE.MeshStandardMaterial;
  private readonly clockCanvas = document.createElement("canvas");
  private readonly clockTexture: THREE.CanvasTexture;
  private shownClock = -1;
  private shake = 0;
  private flash = 0;
  private flashColour = new THREE.Color("#ff2d2d");

  constructor() {
    const pad = new THREE.MeshStandardMaterial({ color: PAD, roughness: 0.7 });
    const steel = new THREE.MeshStandardMaterial({ color: STEEL, roughness: 0.4, metalness: 0.6 });
    const white = new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.4 });
    const orange = new THREE.MeshStandardMaterial({ color: "#ff5a1a", roughness: 0.3, metalness: 0.55, emissive: "#401000", emissiveIntensity: 0.4 });
    this.edgeMat = new THREE.MeshStandardMaterial({ color: "#111111", emissive: "#000000", roughness: 0.3 });

    // The stanchion stands behind the baseline, padded at the base.
    const baseZ = -1.9;
    this.group.add(mesh(new THREE.BoxGeometry(1.5, 1.15, 1.3), pad, 0, 0.575, baseZ - 0.3));
    this.group.add(mesh(new THREE.BoxGeometry(1.52, 0.1, 1.32), white, 0, 1.18, baseZ - 0.3));
    this.group.add(mesh(new THREE.BoxGeometry(0.32, 3.2, 0.32), steel, 0, 2.6, baseZ));
    this.group.add(mesh(new THREE.BoxGeometry(0.42, 1.6, 0.42), pad, 0, 1.9, baseZ));
    const armLen = BOARD.face - baseZ - 0.1;
    const arm = mesh(new THREE.BoxGeometry(0.2, 0.2, armLen), steel, 0, 3.55, baseZ + armLen / 2);
    arm.rotation.x = -0.05;
    this.group.add(arm);
    this.group.add(mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), steel, 0, 3.4, BOARD.face - 0.25));

    // The glass, its frame and the shooter's square.
    const glass = new THREE.MeshPhysicalMaterial({ color: "#d8f0ff", transparent: true, opacity: 0.22, roughness: 0.04, metalness: 0.1, clearcoat: 1, depthWrite: false });
    const w = BOARD.halfWidth * 2;
    const h = BOARD.top - BOARD.bottom;
    const cy = (BOARD.top + BOARD.bottom) / 2;
    const cz = BOARD.face - BOARD.thickness / 2;
    const pane = mesh(new THREE.BoxGeometry(w, h, BOARD.thickness * 0.5), glass, 0, cy, cz, false);
    pane.renderOrder = 2;
    this.group.add(pane);
    const bar = (bw: number, bh: number, x: number, y: number, mat: THREE.Material, depth = 0.05) => this.group.add(mesh(new THREE.BoxGeometry(bw, bh, depth), mat, x, y, cz, false));
    bar(w + 0.06, 0.05, 0, BOARD.top, this.edgeMat);
    bar(w + 0.06, 0.05, 0, BOARD.bottom, this.edgeMat);
    bar(0.05, h, -BOARD.halfWidth, cy, this.edgeMat);
    bar(0.05, h, BOARD.halfWidth, cy, this.edgeMat);
    bar(w + 0.1, 0.1, 0, BOARD.bottom - 0.05, pad, 0.1);
    const sq = { w: 0.59, h: 0.45, y: RIM.y + 0.15 };
    bar(sq.w, 0.05, 0, sq.y + sq.h, white, 0.01);
    bar(sq.w, 0.05, 0, sq.y, white, 0.01);
    bar(0.05, sq.h, -sq.w / 2, sq.y + sq.h / 2, white, 0.01);
    bar(0.05, sq.h, sq.w / 2, sq.y + sq.h / 2, white, 0.01);
    for (const x of [-BOARD.halfWidth * 0.95, BOARD.halfWidth * 0.95]) bar(0.05, 0.05, x, BOARD.top, white, 0.06);

    // The shot clock box above the glass.
    this.clockCanvas.width = 256;
    this.clockCanvas.height = 128;
    this.clockTexture = new THREE.CanvasTexture(this.clockCanvas);
    this.clockTexture.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.MeshBasicMaterial({ map: this.clockTexture, toneMapped: false });
    const box = mesh(new THREE.BoxGeometry(0.62, 0.32, 0.22), new THREE.MeshStandardMaterial({ color: "#0b0d12", roughness: 0.5 }), 0, BOARD.top + 0.22, cz - 0.05);
    this.group.add(box);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.27), face);
    screen.position.set(0, BOARD.top + 0.22, cz + 0.062);
    this.group.add(screen);
    this.setClock(12);

    // The rim on its bracket, in its own group so it can shake.
    this.rim.position.set(RIM.x, RIM.y, RIM.z);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(RIM.radius, RIM.tube * 1.6, 12, 48), orange);
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = true;
    this.rim.add(ring);
    const bracket = mesh(new THREE.BoxGeometry(0.2, 0.05, RIM.z - BOARD.face - RIM.radius + 0.05), orange, 0, -0.02, -(RIM.radius + (RIM.z - BOARD.face - RIM.radius) / 2));
    this.rim.add(bracket);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      this.rim.add(mesh(new THREE.BoxGeometry(0.012, 0.03, 0.012), orange, Math.cos(a) * RIM.radius, -0.02, Math.sin(a) * RIM.radius, false));
    }
    this.net.mesh.position.set(0, -RIM.tube, 0);
    this.rim.add(this.net.mesh);
    this.group.add(this.rim);
  }

  /** Updates the digits only when the whole second changes. */
  setClock(seconds: number): void {
    const shown = Math.ceil(seconds);
    if (shown === this.shownClock) return;
    this.shownClock = shown;
    const ctx = this.clockCanvas.getContext("2d")!;
    ctx.fillStyle = "#050608";
    ctx.fillRect(0, 0, 256, 128);
    ctx.font = 'bold 104px "Courier New", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = shown <= 5 ? "#ff3030" : "#ffb020";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 16;
    ctx.fillText(String(Math.max(0, shown)).padStart(2, "0"), 128, 70);
    this.clockTexture.needsUpdate = true;
  }

  /** The rim and backboard take a hit: a dunk shakes hard, a clank a little. */
  knock(power: number): void {
    this.shake = Math.max(this.shake, power);
  }

  /** The glass edge lights up, red for the buzzer, gold for a win. */
  light(colour: string, seconds: number): void {
    this.flashColour.set(colour);
    this.flash = seconds;
  }

  update(dt: number, time: number, ball: { x: number; y: number; z: number }): void {
    this.shake = Math.max(0, this.shake - dt * 1.8);
    const wobble = this.shake * this.shake;
    this.rim.rotation.x = Math.sin(time * 38) * 0.05 * wobble;
    this.rim.rotation.z = Math.cos(time * 31) * 0.03 * wobble;
    this.rim.position.y = RIM.y - Math.abs(Math.sin(time * 38)) * 0.03 * wobble;
    this.flash = Math.max(0, this.flash - dt);
    const on = this.flash > 0 && Math.sin(time * 18) > -0.3;
    this.edgeMat.emissive.copy(on ? this.flashColour : new THREE.Color("#000000"));
    this.edgeMat.emissiveIntensity = on ? 2.5 : 0;
    this.net.update(dt, ball);
  }

  dispose(): void {
    this.net.dispose();
    this.clockTexture.dispose();
    this.group.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    });
  }
}
