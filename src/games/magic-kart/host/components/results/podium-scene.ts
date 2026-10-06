import * as THREE from "three";
import { createCupTrophy, createPodium, VictoryRoom, type Metal } from "@/games/kit/victory";
import type { CharacterId } from "../../../characters";
import { bakeKartEnvironment, STUDIO } from "../../../render/kart-env";
import { idlePose, KartModel } from "../../../render/models/kart-model";

export interface PodiumPlace {
  place: 1 | 2 | 3;
  character: CharacterId;
  colour: string;
}

const METALS: Record<1 | 2 | 3, Metal> = { 1: "gold", 2: "silver", 3: "bronze" };
const STEP = 2.3;
const KART_SCALE = 0.62;

/**
 * The race's podium: the top three karts on their steps, each with its
 * cup in front, under spotlights with confetti coming down, and the
 * camera swinging slowly round. The winner hops now and then. Built in
 * the victory kit's own room, over the race picture.
 */
export class PodiumScene {
  private readonly room: VictoryRoom;
  private readonly karts: { model: KartModel; place: number; phase: number; baseY: number }[] = [];
  /** A studio for the karts' paint to reflect, so they shine under the spotlights. */
  private readonly environment: THREE.Texture;

  constructor(holder: HTMLElement, places: readonly PodiumPlace[]) {
    this.room = new VictoryRoom(holder, {
      background: "#0b0820",
      floorColour: "#1d1638",
      lights: { count: 4, colours: ["#fff1d6", "#ffd27a", "#bfe3ff", "#ffd27a"], radius: 6, height: 10, intensity: 900, angle: 0.24, beamStrength: 0.22 },
      confetti: { count: 1800, size: 0.09, seed: 11 },
      // Far enough back that Pip's antenna at the top of a hop stays under the name, and the step numbers above the places, from 1280 by 720 up.
      orbit: { centre: { x: 0, y: 0, z: 0 }, radius: 14.25, height: 3.5, lookHeight: 2.25, startAngle: 0, speed: 0.12, arc: 0.3, introS: 2.4, pullBack: 1.45, rise: 2.2, bob: 0.2 },
    });
    this.environment = bakeKartEnvironment(this.room.renderer, STUDIO);
    const podium = createPodium({ width: STEP, height: 1.3 });
    this.room.scene.add(podium.object);
    this.room.scene.updateMatrixWorld(true);
    for (const p of places) {
      const top = podium.topOf(p.place);
      const model = new KartModel(p.character);
      model.setEnvironment(this.environment, 0.8);
      model.root.scale.setScalar(KART_SCALE);
      model.root.position.copy(top).add(new THREE.Vector3(0, 0, -0.15));
      // The two lower karts turn in a little toward the winner.
      model.root.rotation.y = p.place === 2 ? 0.25 : p.place === 3 ? -0.25 : 0;
      this.room.scene.add(model.root);
      this.karts.push({ model, place: p.place, phase: p.place * 1.3, baseY: model.root.position.y });
      const cup = createCupTrophy({ metal: METALS[p.place] });
      cup.scale.setScalar(p.place === 1 ? 1.9 : 1.5);
      cup.position.copy(top).add(new THREE.Vector3(0.55, 0, 0.72));
      this.room.scene.add(cup);
    }
    this.room.lights.aimAt(new THREE.Vector3(0, 1.3, 0));
    this.room.confetti.cannons({ x: 0, y: 0, z: 0 }, { ring: 5, cannons: 4, count: 300, speed: 15 });
    this.room.confetti.startRain({ x: 0, y: 11, z: 0 }, 5, 140);
    this.room.onFrame((dt, time) => this.animate(dt, time));
    this.room.start();
  }

  dispose(): void {
    // Kart shapes are shared with the race, so only each kart's own materials go.
    for (const { model } of this.karts) {
      this.room.scene.remove(model.root);
      model.dispose();
    }
    this.environment.dispose();
    this.room.dispose();
  }

  private animate(dt: number, time: number): void {
    for (const kart of this.karts) {
      const root = kart.model.root;
      // The winner hops every couple of seconds; the others idle with a little steer wiggle.
      const hop = kart.place === 1 ? Math.max(0, Math.sin(time * 3.2)) ** 6 * 0.25 : 0;
      root.position.y = kart.baseY + hop;
      kart.model.animate(dt, time, idlePose(Math.sin(time * 1.4 + kart.phase) * 0.35));
    }
  }
}
