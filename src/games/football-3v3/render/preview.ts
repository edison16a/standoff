import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { AthleteView, BallView } from "../engine/view";
import { BUILDS, type BuildId } from "../builds";
import type { TeamId } from "../teams";
import type { PoseScene } from "./anim/choose";
import { Figure } from "./figures/figure";
import { AthleteMaterials } from "./materials/athlete-materials";
import { glossEnvironment } from "./materials/gloss-env";
import { AthleteShapes } from "./models/athlete-shapes";
import { buildKit } from "./models/kit";

const BALL: BallView = {
  x: 0, y: 0, z: 9, vx: 0, vy: 0, vz: 0, quat: { x: 0, y: 0, z: 0, w: 1 }, axis: { x: 1, y: 0, z: 0 }, spin: 0, style: "spiral", knock: null, goal: null,
  state: "dead", holder: null, pitch: false,
};

/** The build standing on the podium, or celebrating `celebrating` seconds in. */
function still(build: BuildId, team: TeamId, celebrating: number | null): AthleteView {
  return {
    id: 0, team, role: "runner", slot: 0, build, number: BUILDS[build].number, seat: null,
    x: 0, z: 0, yaw: 0, vx: 0, vz: 0, speed: 0, ax: 0, az: 0, stagger: 0,
    action: celebrating === null ? "none" : "celebrate", actionT: celebrating ?? 0, actionDur: 3,
    juke: null, side: 1, plant: 0, lob: false, throwKind: null, downCause: null, lunge: null, tackle: null, catching: null, block: null, stumble: null, spike: false, hasBall: false, targeted: false, guarding: null, rushing: false, blocked: false, ceremony: null,
  };
}

/**
 * The build turning on a podium on the phone's picker, in their side's
 * uniform with their own touches. Every few seconds they face the phone
 * and do their touchdown celebration. It owns a small renderer and stops
 * drawing when disposed.
 */
export class StarPreview {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  private readonly turntable = new THREE.Group();
  private readonly materials: AthleteMaterials;
  private readonly shapes = new AthleteShapes(true);
  private readonly gloss: THREE.Texture;
  private readonly canvas: HTMLCanvasElement;
  private readonly environment: THREE.Texture;
  private figure: Figure | null = null;
  private shown: { build: BuildId; team: TeamId } | null = null;
  private frame = 0;
  private last = 0;
  private shownAt = 0;

  /** Makes its own canvas inside `holder`, so a released canvas is never reused. */
  constructor(holder: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "fb-preview__canvas";
    holder.appendChild(this.canvas);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = 0.4;
    this.gloss = glossEnvironment(this.renderer);
    this.materials = new AthleteMaterials("high", this.gloss);
    this.scene.add(new THREE.HemisphereLight("#dfe8ff", "#1d3a24", 1.3));
    const key = new THREE.DirectionalLight("#fff3dc", 2.6);
    key.position.set(3, 6, 5);
    const rim = new THREE.DirectionalLight("#8fc4ff", 1.8);
    rim.position.set(-4, 3, -4);
    this.scene.add(key, rim);
    const podium = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1, 0.14, 48), new THREE.MeshStandardMaterial({ color: "#2f7a36", roughness: 0.9 }));
    podium.position.y = -0.07;
    this.turntable.add(podium);
    this.scene.add(this.turntable);
    this.camera.position.set(0, 1.25, 5.2);
    this.camera.lookAt(0, 1, 0);
    this.frame = requestAnimationFrame(this.draw);
  }

  show(build: BuildId, team: TeamId): void {
    if (this.shown?.build === build && this.shown.team === team) return;
    this.shown = { build, team };
    this.figure?.dispose();
    this.figure = new Figure(buildKit(team, build), { materials: this.materials, shapes: this.shapes }, 0);
    this.turntable.add(this.figure.root);
    this.shownAt = this.last;
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.figure?.dispose();
    this.figure = null;
    // Only the podium is left on the turntable; the figure freed its own parts.
    this.turntable.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    this.materials.dispose();
    this.shapes.dispose();
    this.gloss.dispose();
    this.environment.dispose();
    this.renderer.dispose();
    // Phones allow only a few live WebGL contexts; moving between steps must not use them up.
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }

  private readonly draw = (now: number) => {
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const shown = this.shown;
    if (width > 0 && height > 0 && this.figure && shown) {
      const size = this.renderer.getSize(new THREE.Vector2());
      if (size.x !== width || size.y !== height) {
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
      }
      // Turn slowly, and every seven seconds face the phone and celebrate.
      const t = (now - this.shownAt) / 1000;
      const cycle = t % 7;
      const celebrating = cycle > 4 ? cycle - 4 : null;
      const angle = this.turntable.rotation.y;
      const front = Math.round(angle / (Math.PI * 2)) * Math.PI * 2;
      this.turntable.rotation.y = celebrating !== null ? angle + (front - angle) * (1 - Math.exp(-dt * 6)) : angle + dt * 0.8;
      const scene: PoseScene = { phase: "live", phaseT: t, offense: shown.team, ball: BALL, winner: null, center: false, kicker: null, ceremonyT: null };
      this.figure.update(still(shown.build, shown.team, celebrating), scene, dt, now / 1000);
      this.renderer.render(this.scene, this.camera);
    }
    this.frame = requestAnimationFrame(this.draw);
  };
}
