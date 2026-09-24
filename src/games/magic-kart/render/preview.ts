import * as THREE from "three";
import { CHARACTERS, type CharacterId } from "../characters";
import { KartModel } from "./models/kart-model";

/**
 * The spinning kart on the phone's picker: the very same model the big
 * screen races, on a little turntable under studio lights. It owns its
 * own small renderer and stops drawing when disposed.
 */
export class KartPreview {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  private readonly turntable = new THREE.Group();
  private readonly ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  private model: KartModel | null = null;
  private frame = 0;
  private last = 0;
  private angle = -0.6;

  private readonly canvas: HTMLCanvasElement;

  /**
   * The preview makes its own canvas inside `holder`, so a canvas whose
   * context was released is never handed to a new preview (React mounts
   * effects twice in development).
   */
  constructor(holder: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "mk-pick__canvas";
    holder.appendChild(this.canvas);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene.add(new THREE.HemisphereLight("#ffffff", "#6b5a8a", 1.6));
    const key = new THREE.DirectionalLight("#fff3dc", 2.6);
    key.position.set(4, 6, 5);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight("#9fd8ff", 1.4);
    rim.position.set(-5, 3, -4);
    this.scene.add(rim);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.2, 0.16, 48), new THREE.MeshStandardMaterial({ color: "#2c2446", roughness: 0.6 }));
    disc.position.y = -0.08;
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(2.12, 0.04, 8, 64), new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }));
    this.ring.rotation.x = Math.PI / 2;
    this.turntable.add(disc, this.ring);
    this.scene.add(this.turntable);
    this.camera.position.set(0, 2.2, 5.3);
    this.camera.lookAt(0, 0.75, 0);
    this.frame = requestAnimationFrame(this.draw);
  }

  show(character: CharacterId): void {
    if (this.model?.character === character) return;
    if (this.model) {
      this.turntable.remove(this.model.root);
      this.model.dispose();
    }
    this.model = new KartModel(character);
    this.turntable.add(this.model.root);
    this.ring.material.color.set(CHARACTERS[character].color);
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    if (this.model) this.turntable.remove(this.model.root);
    this.model?.dispose();
    // The turntable and ring are this preview's own. The kart geometry is shared, so it stays.
    this.turntable.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      (object.material as THREE.Material).dispose();
    });
    this.renderer.dispose();
    // Phones allow only a few live WebGL contexts; flipping between setup steps must not use them up.
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }

  private readonly draw = (now: number) => {
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width > 0 && height > 0) {
      const size = this.renderer.getSize(new THREE.Vector2());
      if (size.x !== width || size.y !== height) {
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
      }
      this.angle += dt * 0.7;
      this.turntable.rotation.y = this.angle;
      // Idle wheels turn slowly and the steering wanders, so the kart looks alive.
      this.model?.animate(3, Math.sin(now / 900) * 0.6, dt, now / 1000, 0);
      this.renderer.render(this.scene, this.camera);
    }
    this.frame = requestAnimationFrame(this.draw);
  };
}
