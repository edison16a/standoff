import * as THREE from "three";
import { createCupTrophy, createPedestal, PAPER_COLOURS, VictoryRoom } from "@/games/kit/victory";
import { applyPose } from "../../../render/anim/pose";
import { STYLES } from "../../../render/anim/styles";
import { buildFighter } from "../../../render/models/build";
import { glowMaterial, solidMaterial } from "../../../render/models/geo";
import type { Dims, Rig } from "../../../render/models/rig";
import type { CharacterId } from "../../../roster";
import { championPose, liftFrames, type Hold, type Keyframes } from "./champion-pose";

const PEDESTAL_TOP = 0.8;

/** Fighters with a weapon lift the cup in the left hand and keep the weapon low in the right. */
const HOLDS: Record<CharacterId, Hold> = {
  karate: { hands: "both" },
  bear: { hands: "both" },
  // The katana points forward and down past the knee, its tip clear of the pedestal.
  samurai: { hands: "left", weapon: { armRRaise: 0.3, armRSpread: 0.35, elbowR: 0.3, wristR: -1.2 } },
  // The staff stands upright at the side, its gem glowing by the head.
  mage: { hands: "left", weapon: { armRRaise: 0.3, armRSpread: 0.3, elbowR: 0.8, wristR: -1.1 } },
};

/** How high a fighter's raised hands reach, and the cup over them, for Karate, the fighter the shot was set for. */
const KARATE_REACH = 2.37;
const CUP_HEIGHT = 0.5;

/**
 * The circling camera for one fighter: far enough back that the raised
 * cup stays under the name across the top, and further for a big one
 * like the Bear.
 */
function framing(d: Dims): { radius: number; height: number; lookHeight: number } {
  const k = (d.hipY + d.torso + d.upper + d.fore + CUP_HEIGHT) / KARATE_REACH;
  return { radius: 8.1 * k, height: PEDESTAL_TOP + 1.3 * k, lookHeight: PEDESTAL_TOP + 1.9 * k };
}

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
  private readonly hold: Hold;
  private readonly frames: Keyframes;
  private readonly left = new THREE.Vector3();
  private readonly right = new THREE.Vector3();

  constructor(holder: HTMLElement, character: CharacterId, colours: readonly string[]) {
    this.rig = buildFighter(character, null, this.solid, this.glow);
    this.room = new VictoryRoom(holder, {
      background: "#120a24",
      floorColour: "#1c1233",
      lights: { count: 4, colours: ["#fff1d6", "#ffd27a", ...colours.slice(0, 2)], radius: 4.5, height: 9, intensity: 700, angle: 0.2, beamStrength: 0.24 },
      confetti: { count: 1600, size: 0.06, colours: [...colours, ...PAPER_COLOURS.slice(0, 3)], seed: 5 },
      orbit: { ...framing(this.rig.dims), speed: 0.14, arc: 0.5, introS: 2.4, pullBack: 1.45, rise: 1.6, bob: 0.15 },
    });
    this.room.scene.add(createPedestal({ radius: 0.95, height: PEDESTAL_TOP }));
    this.rig.joints.root.position.y = PEDESTAL_TOP;
    for (const mesh of this.rig.meshes) mesh.castShadow = true;
    this.room.scene.add(this.rig.joints.root);
    this.cup = createCupTrophy({ metal: "gold" });
    this.cup.scale.setScalar(1.25);
    this.room.scene.add(this.cup);
    this.room.lights.aimAt(new THREE.Vector3(0, PEDESTAL_TOP, 0));
    this.room.confetti.cannons({ x: 0, y: 0, z: 0 }, { ring: 3.4, cannons: 4, count: 260, speed: 13 });
    this.room.confetti.startRain({ x: 0, y: 8, z: 0 }, 3.5, 110);
    this.hold = HOLDS[character];
    this.frames = liftFrames(this.hold);
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
    applyPose(championPose(time, stance, this.frames, this.hold), this.rig.joints, this.rig.dims);
    // The cup stands upright with its stem in the grip: between the hands, or in the left alone.
    this.rig.joints.root.updateMatrixWorld(true);
    this.rig.joints.handL.getWorldPosition(this.left);
    if (this.hold.hands === "both") {
      this.rig.joints.handR.getWorldPosition(this.right);
      this.cup.position.copy(this.left).add(this.right).multiplyScalar(0.5);
    } else this.cup.position.copy(this.left);
    this.cup.position.y -= 0.12;
  }
}
