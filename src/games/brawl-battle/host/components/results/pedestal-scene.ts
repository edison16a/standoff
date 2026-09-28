import * as THREE from "three";
import { createCupTrophy, createPedestal, PAPER_COLOURS, VictoryRoom } from "@/games/kit/victory";
import { applyPose } from "../../../render/anim/pose";
import { STYLES } from "../../../render/anim/styles";
import { buildFighter } from "../../../render/models/build";
import { glowMaterial, solidMaterial } from "../../../render/models/geo";
import type { Rig } from "../../../render/models/rig";
import type { CharacterId } from "../../../roster";
import { championPose } from "./champion-pose";

const PEDESTAL_TOP = 0.8;

/**
 * The winner on a pedestal lifting a gold cup over their head, under
 * spotlights with confetti in every fighter's colour, as the camera
 * swings slowly round. Built in the victory kit's own room, over the
 * arena behind.
 */
export class PedestalScene {
  private readonly room: VictoryRoom;
  private readonly rig: Rig;
  private readonly solid = solidMaterial();
  private readonly glow = glowMaterial();
  private readonly cup: THREE.Group;
  private readonly left = new THREE.Vector3();
  private readonly right = new THREE.Vector3();

  constructor(holder: HTMLElement, character: CharacterId, colours: readonly string[]) {
    this.room = new VictoryRoom(holder, {
      background: "#120a24",
      floorColour: "#1c1233",
      lights: { count: 4, colours: ["#fff1d6", "#ffd27a", ...colours.slice(0, 2)], radius: 4.5, height: 9, intensity: 700, angle: 0.2, beamStrength: 0.24 },
      confetti: { count: 1600, size: 0.06, colours: [...colours, ...PAPER_COLOURS.slice(0, 3)], seed: 5 },
      orbit: { radius: 5.2, height: 1.9, lookHeight: 1.75, speed: 0.14, arc: 0.5, introS: 2.4, pullBack: 1.5, rise: 1.6, bob: 0.15 },
    });
    this.room.scene.add(createPedestal({ radius: 0.95, height: PEDESTAL_TOP }));
    this.rig = buildFighter(character, null, this.solid, this.glow);
    this.rig.joints.root.position.y = PEDESTAL_TOP;
    for (const mesh of this.rig.meshes) mesh.castShadow = true;
    this.room.scene.add(this.rig.joints.root);
    this.cup = createCupTrophy({ metal: "gold" });
    this.cup.scale.setScalar(1.25);
    this.room.scene.add(this.cup);
    this.room.lights.aimAt(new THREE.Vector3(0, PEDESTAL_TOP, 0));
    this.room.confetti.cannons({ x: 0, y: 0, z: 0 }, { ring: 3.4, cannons: 4, count: 260, speed: 13 });
    this.room.confetti.startRain({ x: 0, y: 8, z: 0 }, 3.5, 110);
    const stance = STYLES[character].stance;
    this.room.onFrame((_dt, time) => this.pose(time, stance));
    this.room.start();
  }

  dispose(): void {
    // The fighter's shapes are its own, so they go with the room; the shared materials go here.
    this.room.dispose();
    this.solid.dispose();
    this.glow.dispose();
  }

  private pose(time: number, stance: Parameters<typeof championPose>[1]): void {
    applyPose(championPose(time, stance), this.rig.joints, this.rig.dims);
    // The cup sits between the hands, upright, its foot just above the grip.
    this.rig.joints.root.updateMatrixWorld(true);
    this.rig.joints.handL.getWorldPosition(this.left);
    this.rig.joints.handR.getWorldPosition(this.right);
    this.cup.position.copy(this.left).add(this.right).multiplyScalar(0.5);
    this.cup.position.y -= 0.12;
  }
}
