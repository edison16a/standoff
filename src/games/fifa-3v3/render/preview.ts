import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { ROSTER, type CharacterId } from "../roster";
import { celebration } from "./anim/celebrations";
import { idle } from "./anim/moves";
import { applyPose, ease, neutral, type Pose } from "./anim/pose";
import { buildBody, type Rig } from "./models/body";

/**
 * The star turning on a spotlit podium on the phone's picker, in their
 * own signature kit. Every few seconds they break into their goal
 * celebration. It owns a small renderer and stops drawing when disposed.
 */
export class StarPreview {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  private readonly turntable = new THREE.Group();
  private readonly material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
  private readonly ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  private readonly canvas: HTMLCanvasElement;
  private readonly environment: THREE.Texture;
  private rig: Rig | null = null;
  private character: CharacterId | null = null;
  private readonly pose: Pose = neutral();
  private frame = 0;
  private last = 0;
  private shownAt = 0;

  /** Makes its own canvas inside `holder`, so a released canvas is never reused. */
  constructor(holder: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "fifa-preview__canvas";
    holder.appendChild(this.canvas);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = 0.4;
    this.scene.add(new THREE.HemisphereLight("#dfe8ff", "#1d3a24", 1.3));
    const key = new THREE.DirectionalLight("#fff3dc", 2.6);
    key.position.set(3, 6, 5);
    const rim = new THREE.DirectionalLight("#8fc4ff", 1.8);
    rim.position.set(-4, 3, -4);
    this.scene.add(key, rim);
    const podium = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1, 0.14, 48), new THREE.MeshStandardMaterial({ color: "#1f7a34", roughness: 0.9 }));
    podium.position.y = -0.07;
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.025, 8, 64), new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }));
    this.ring.rotation.x = Math.PI / 2;
    this.turntable.add(podium, this.ring);
    this.scene.add(this.turntable);
    this.camera.position.set(0, 1.3, 4.6);
    this.camera.lookAt(0, 1.02, 0);
    this.frame = requestAnimationFrame(this.draw);
  }

  show(character: CharacterId): void {
    if (this.character === character) return;
    this.character = character;
    if (this.rig) {
      this.turntable.remove(this.rig.root);
      this.rig.dispose();
    }
    const c = ROSTER[character];
    this.rig = buildBody({ look: c.look, kit: c.look.kit, name: c.short, number: c.number }, this.material);
    this.turntable.add(this.rig.root);
    this.ring.material.color.set(c.look.kit.shirt);
    this.shownAt = this.last;
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.rig?.dispose();
    this.turntable.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material !== this.material) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    this.material.dispose();
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
    if (width > 0 && height > 0 && this.rig && this.character) {
      const size = this.renderer.getSize(new THREE.Vector2());
      if (size.x !== width || size.y !== height) {
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
      }
      // Turn slowly, and every six seconds celebrate facing the phone.
      const t = (now - this.shownAt) / 1000;
      const cycle = t % 6;
      const celebrating = cycle > 3.2;
      const angle = this.turntable.rotation.y;
      const front = Math.round(angle / (Math.PI * 2)) * Math.PI * 2;
      this.turntable.rotation.y = celebrating ? angle + (front - angle) * (1 - Math.exp(-dt * 6)) : angle + dt * 0.8;
      const target = celebrating ? celebration(ROSTER[this.character].celebration, cycle - 3.2) : idle(now / 1000, 0);
      ease(this.pose, target, 1 - Math.exp(-dt * 12));
      applyPose(this.rig, this.pose);
      this.renderer.render(this.scene, this.camera);
    }
    this.frame = requestAnimationFrame(this.draw);
  };
}
