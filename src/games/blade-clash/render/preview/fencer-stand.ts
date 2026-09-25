import * as THREE from "three";
import type { CharacterId } from "@/games/blade-clash/characters";
import type { FencerAction, FencerFrame } from "@/games/blade-clash/engine/frames";
import type { Slot } from "@/games/blade-clash/players";
import { FencerView } from "../fencer/fencer-view";
import { BladeTrail } from "../effects/blade-trail";
import { disposeOwned } from "../kit/mesh-builder";
import { PLAYER_COLOURS } from "../player-colours";
import type { PreviewSubject } from "./preview-hub";

export interface SwordAngles {
  pitch: number;
  yaw: number;
  roll: number;
}

/** A canned action for the preview to play, like a lunge when the practice step reads a jab. */
export interface PreviewAction {
  action: FencerAction;
  startedAt: number;
}

export type StandFraming = "card" | "hero";

/**
 * One fencer on a small lit stand, for the phone: the same model and
 * animation as the big screen. With a sword reading it copies the phone,
 * and it can play a lunge or a parry on cue, leaving a blade trail.
 */
export class FencerStand implements PreviewSubject {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
  private readonly fencer: FencerView;
  private readonly trail: BladeTrail;
  private readonly stand = new THREE.Group();
  sword: (() => SwordAngles | null) | null = null;
  action: (() => PreviewAction | null) | null = null;

  constructor(
    readonly canvas: HTMLCanvasElement,
    private characterId: CharacterId,
    private readonly slot: Slot,
    framing: StandFraming,
  ) {
    this.fencer = new FencerView(slot);
    this.trail = new BladeTrail(PLAYER_COLOURS[slot]);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x6b5a8a, 1.3));
    const key = new THREE.DirectionalLight(0xfff3dc, 2.6);
    key.position.set(3, 5, 4);
    const rim = new THREE.DirectionalLight(0x9fc4ff, 2.2);
    rim.position.set(-4, 3, -3);
    this.scene.add(key, rim);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.08, 48), new THREE.MeshStandardMaterial({ color: 0x241d3a, roughness: 0.5, metalness: 0.3 }));
    disc.position.y = -0.04;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.018, 8, 64), new THREE.MeshBasicMaterial({ color: PLAYER_COLOURS[slot], toneMapped: false }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.002;
    this.stand.add(disc, ring);
    this.scene.add(this.stand, this.fencer.group, this.trail.mesh);
    // The fencer spans from the back foot to the blade tip, so the camera looks at the middle of that.
    if (framing === "hero") {
      this.camera.position.set(1.05, 1.25, 3.9);
      this.camera.lookAt(0.42, 0.88, 0);
    } else {
      this.camera.position.set(0.9, 1.3, 4.3);
      this.camera.lookAt(0.38, 0.86, 0);
    }
  }

  setCharacter(characterId: CharacterId): void {
    this.characterId = characterId;
  }

  frame(now: number): { scene: THREE.Scene; camera: THREE.PerspectiveCamera } {
    const live = this.sword?.() ?? null;
    const sword = live ?? { pitch: 0.05 * Math.sin(now / 900), yaw: 0.08 * Math.sin(now / 1300), roll: 0 };
    const cue = this.action?.() ?? null;
    const actionMs = cue ? now - cue.startedAt : 0;
    const frame: FencerFrame = {
      slot: this.slot, characterId: this.characterId, x: 0, facing: 1, ...sword, speed: 0,
      action: cue?.action ?? "idle", actionMs, parrying: cue?.action === "parry" && actionMs < 600,
    };
    this.fencer.update(frame, now);
    if (live || cue) this.trail.add(this.fencer.tip, this.fencer.mid, now);
    this.trail.update(now);
    return { scene: this.scene, camera: this.camera };
  }

  dispose(): void {
    this.fencer.dispose();
    this.trail.dispose();
    disposeOwned(this.stand);
  }
}
