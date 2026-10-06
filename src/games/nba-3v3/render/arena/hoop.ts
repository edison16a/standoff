import * as THREE from "three";
import { BOARD, RIM } from "../../engine/tuning";
import type { Athlete } from "../../engine/types";
import { Net } from "./net";
import { RimSpring, StandSway } from "./rim-spring";
import { buildBackboard, GLASS_Z } from "./backboard";
import { Bake } from "./bake";
import { BASE_Z, buildStanchion } from "./stanchion";

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, shadow = true): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = shadow;
  return m;
}

/**
 * The basket: a padded stanchion behind the baseline (stanchion.ts), its
 * arms out to the glass backboard (backboard.ts), the orange rim
 * on its bracket, the net, and the shot clock box on top showing the
 * real seconds. The ring is hinged at the bracket on a spring: it dips
 * and rings when the ball hits it, bends down while a dunker hangs on
 * it, and the net hangs from it as cloth.
 */
export class Hoop {
  readonly group = new THREE.Group();
  readonly net = new Net();
  /** The hinge at the bracket the ring flexes about, and the ring on it. */
  private readonly hinge = new THREE.Group();
  private readonly rim = new THREE.Group();
  private readonly spring = new RimSpring();
  private readonly stand = new StandSway();
  private readonly ringMatrix = new THREE.Matrix4();
  private readonly ballLocal = new THREE.Vector3();
  private readonly edgeMat: THREE.MeshStandardMaterial;
  private readonly clockCanvas = document.createElement("canvas");
  private readonly clockTexture: THREE.CanvasTexture;
  private shownClock = -1;
  private flash = 0;
  private flashColour = new THREE.Color("#ff2d2d");
  private readonly extras: (() => void)[] = [];

  constructor() {
    const orange = new THREE.MeshStandardMaterial({ color: "#ff5a1a", roughness: 0.3, metalness: 0.55, emissive: "#401000", emissiveIntensity: 0.4 });
    const stanchion = buildStanchion();
    const board = buildBackboard();
    this.edgeMat = board.edge;
    this.extras.push(stanchion.dispose, board.dispose);
    this.group.add(stanchion.group, board.group);
    const cz = GLASS_Z;

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

    // The rim on its bracket, hinged where the bracket meets the glass so it can flex.
    this.hinge.position.set(RIM.x, RIM.y, BOARD.face);
    this.rim.position.set(0, 0, RIM.z - BOARD.face);
    // The ring, its bracket and the twelve net hooks are one piece of orange steel.
    const rim = new Bake();
    rim.add(new THREE.TorusGeometry(RIM.radius, RIM.tube * 1.6, 12, 48), orange, { rx: Math.PI / 2 });
    rim.add(new THREE.BoxGeometry(0.2, 0.05, RIM.z - BOARD.face - RIM.radius + 0.05), orange, { y: -0.02, z: -(RIM.radius + (RIM.z - BOARD.face - RIM.radius) / 2) });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      rim.add(new THREE.BoxGeometry(0.012, 0.03, 0.012), orange, { x: Math.cos(a) * RIM.radius, y: -0.02, z: Math.sin(a) * RIM.radius });
    }
    this.rim.add(...rim.build());
    this.hinge.add(this.rim);
    this.group.add(this.hinge, this.net.mesh);
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

  /** The rim takes a hit where the ball is: a clank at the front dips it most, one to the side rolls it. */
  knock(power: number): void {
    this.spring.knock(power, this.ballLocal.x - RIM.x, this.ballLocal.z - BOARD.face);
    this.stand.knock(power);
  }

  /** A dunker hanging on the rim bends it down until he lets go. */
  hold(on: boolean): void {
    this.spring.hold(on);
  }

  /** Rocks the whole basket about the foot of the stanchion, which stays put on the floor. */
  private sway(dt: number): void {
    this.stand.step(dt);
    const a = this.stand.angle;
    this.group.rotation.x = a;
    this.group.position.set(0, -BASE_Z * Math.sin(a), BASE_Z * (1 - Math.cos(a)));
  }

  /** The glass edge lights up, red for the buzzer, gold for a win. */
  light(colour: string, seconds: number): void {
    this.flashColour.set(colour);
    this.flash = seconds;
  }

  update(dt: number, time: number, ball: { x: number; y: number; z: number }): void {
    this.ballLocal.set(ball.x, ball.y, ball.z);
    this.group.worldToLocal(this.ballLocal);
    this.spring.step(dt);
    this.hinge.rotation.set(this.spring.pitch, 0, this.spring.roll);
    this.sway(dt);
    this.flash = Math.max(0, this.flash - dt);
    const on = this.flash > 0 && Math.sin(time * 18) > -0.3;
    if (on) this.edgeMat.emissive.copy(this.flashColour);
    else this.edgeMat.emissive.setRGB(0, 0, 0);
    this.edgeMat.emissiveIntensity = on ? 2.5 : 0;
    this.hinge.updateMatrix();
    this.rim.updateMatrix();
    this.ringMatrix.multiplyMatrices(this.hinge.matrix, this.rim.matrix);
    this.net.update(dt, this.ballLocal, this.ringMatrix);
  }

  dispose(): void {
    this.net.dispose();
    this.clockTexture.dispose();
    for (const dispose of this.extras) dispose();
    this.group.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    });
  }
}

/** Whether anyone is hanging on the rim after a dunk right now. */
export function hanging(athletes: readonly Athlete[]): boolean {
  return athletes.some((a) => a.action.kind === "drive" && a.action.rimHang > 0 && a.action.t > a.action.finish && a.action.t < a.action.finish + a.action.rimHang);
}
