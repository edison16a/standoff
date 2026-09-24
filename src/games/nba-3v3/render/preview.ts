import * as THREE from "three";
import { softwareWebGl } from "@/games/kit/camera/model/gpu-check";
import type { TeamId } from "../engine/types";
import { CHARACTERS, TEAMS, type CharacterId } from "../roster";
import { locomotion } from "./anim/locomotion";
import { applyPose } from "./anim/pose";
import { buildAthlete, type AthleteModel } from "./models/athlete-model";
import { ballTexture } from "./textures";

/**
 * The star on the phone's picker: the very same model the big screen
 * plays with, dribbling on a little spotlit stand and turning slowly.
 * It owns its own small renderer and releases its context when disposed.
 */
export class AthletePreview {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
  private readonly turntable = new THREE.Group();
  private readonly bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.58 });
  private readonly ball: THREE.Mesh;
  private readonly canvas: HTMLCanvasElement;
  private model: AthleteModel | null = null;
  private shown: string | null = null;
  private frame = 0;
  private last = 0;
  private angle = -0.5;
  private dribble = 0;

  constructor(holder: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "nba-preview__canvas";
    holder.appendChild(this.canvas);
    // A phone without a working graphics driver draws in software, so it draws fewer pixels.
    const soft = softwareWebGl();
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: !soft, alpha: true });
    this.renderer.setPixelRatio(soft ? 1 : Math.min(2, window.devicePixelRatio || 1));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene.add(new THREE.HemisphereLight("#dbe7ff", "#3b2a1a", 1.6));
    const key = new THREE.DirectionalLight("#fff3e0", 2.6);
    key.position.set(3, 6, 5);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight("#9cc3ff", 1.6);
    rim.position.set(-4, 3, -4);
    this.scene.add(rim);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.08, 40), new THREE.MeshStandardMaterial({ color: "#d9a86c", roughness: 0.35 }));
    disc.position.y = -0.04;
    this.turntable.add(disc);
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16), new THREE.MeshStandardMaterial({ map: ballTexture(), roughness: 0.6 }));
    this.scene.add(this.turntable, this.ball);
    this.frame = requestAnimationFrame(this.draw);
  }

  show(character: CharacterId, team: TeamId | null): void {
    const key = `${character}:${team}`;
    if (this.shown === key) return;
    this.shown = key;
    if (this.model) {
      this.turntable.remove(this.model.joints.root);
      this.model.dispose();
    }
    const kit = team === null ? { name: "Stars", color: "#475569", dark: "#1e293b", trim: "#e2e8f0" } : TEAMS[team];
    this.model = buildAthlete(CHARACTERS[character], kit, this.bodyMat);
    this.turntable.add(this.model.joints.root);
    const h = CHARACTERS[character].build.height;
    this.camera.position.set(0, h * 0.62, h * 2.35);
    this.camera.lookAt(0, h * 0.5, 0);
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    if (this.model) this.turntable.remove(this.model.joints.root);
    this.model?.dispose();
    this.scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.geometry.dispose();
      const m = o.material as THREE.MeshStandardMaterial;
      m.map?.dispose();
      m.dispose();
    });
    this.renderer.dispose();
    // Phones allow only a few live WebGL contexts; flipping between steps must not use them up.
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }

  private readonly draw = (now: number) => {
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width > 0 && height > 0 && this.model) {
      const size = this.renderer.getSize(new THREE.Vector2());
      if (size.x !== width || size.y !== height) {
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
      }
      this.angle += dt * 0.6;
      this.turntable.rotation.y = this.angle;
      this.dribble = (this.dribble + dt * 1.8) % 1;
      const pose = locomotion({ speed: 0, phase: 0, lateral: 0, guarding: false, dribble: this.dribble, time: now / 1000, seed: 0 });
      applyPose(pose, this.model.joints, this.model.dims);
      this.turntable.updateMatrixWorld(true);
      // The ball bounces under the dribbling hand, sharp at the floor and slow at the top.
      const hand = this.model.joints.handR.localToWorld(new THREE.Vector3(0, -0.08, 0.05));
      const drop = 1 - Math.abs(1 - 2 * this.dribble);
      this.ball.position.set(hand.x, 0.12 + (hand.y - 0.2) * (1 - drop * drop), hand.z);
      this.renderer.render(this.scene, this.camera);
    }
    this.frame = requestAnimationFrame(this.draw);
  };
}
