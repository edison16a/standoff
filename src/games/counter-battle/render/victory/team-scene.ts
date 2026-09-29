import * as THREE from "three";
import { createCupTrophy, createPedestal, PAPER_COLOURS, VictoryRoom } from "@/games/kit/victory";
import type { TeamId } from "../../engine/fighter";
import type { GunId } from "../../engine/guns";
import type { CharacterId } from "../../roster";
import { TEAMS } from "../../teams";
import { Animator } from "../anim/animator";
import { liftTrophy } from "../anim/victory";
import { BodySplats } from "../effects/body-splats";
import { Splats } from "../effects/splats";
import { buildCharacter, type CharacterModel } from "../models/character";
import { buildGun, type GunModel } from "../models/guns";
import { paintTheScene } from "./team-paint";
import { celebrating, CUP, SHIFT, STAGE, standSpots, teamShot, type StandSpot } from "./team-stage";

/** One winner as the results know them. */
export interface TeamWinner {
  character: CharacterId;
  gun: GunId;
  /** Their own seat colour, which marks their kit. */
  colour: string;
}

interface Member {
  model: CharacterModel;
  gun: GunModel;
  gunId: GunId;
  character: CharacterId;
  animator: Animator;
  spot: StandSpot;
}

const NO_PUSH = { x: 0, z: -1 };

/**
 * The winning team together on a low stage, spattered with paint from
 * the fight, the top scorer holding a gold cup high while the others
 * celebrate each in their own way, under spotlights with confetti in
 * the team's colour. Built in the victory kit's own room, over the field.
 */
export class TeamScene {
  private readonly room: VictoryRoom;
  private readonly team = new THREE.Group();
  private readonly members: Member[] = [];
  private readonly cup = createCupTrophy({ metal: "gold" });
  private readonly floor = new Splats();
  private readonly body: BodySplats;
  private readonly wrist = new THREE.Vector3();

  constructor(holder: HTMLElement, side: TeamId, winners: readonly TeamWinner[]) {
    const own = TEAMS[side];
    const losers = TEAMS[side === 0 ? 1 : 0];
    this.room = new VictoryRoom(holder, {
      background: "#0c0a1a",
      floorColour: "#1b1630",
      lights: { count: 4, colours: ["#fff1d6", own.color, "#ffd27a", "#fff1d6"], radius: 4.6, height: 9, intensity: 650, angle: 0.25, beamStrength: 0.22 },
      confetti: { count: 1500, size: 0.045, colours: [own.color, own.color, "#b8f400", "#ffffff", ...winners.map((w) => w.colour), ...PAPER_COLOURS.slice(0, 2)], seed: 3 },
      orbit: teamShot(winners.length),
    });
    this.body = new BodySplats(this.floor.texture);
    this.room.scene.add(createPedestal({ radius: STAGE.radius, height: STAGE.height, colour: "#231b3b" }), this.floor.mesh, this.team, this.cup);
    // The fighters stand on the stage; the animator places each on the floor of this group.
    this.team.position.y = STAGE.height;
    this.cup.scale.setScalar(CUP.scale);
    const spots = standSpots(winners.length);
    winners.forEach((w, i) => {
      const model = buildCharacter(w.character, { team: own.color, dark: own.dark, player: w.colour });
      const gun = buildGun(w.gun, own.color);
      const animator = new Animator(model.rig, gun, w.character, i * 7 + 3, null);
      this.team.add(model.rig.root);
      this.members.push({ model, gun, gunId: w.gun, character: w.character, animator, spot: spots[i]! });
    });
    // Posed once so the paint lands on the bodies where they stand.
    this.pose(1 / 30, 0);
    this.room.scene.updateMatrixWorld(true);
    paintTheScene(
      this.members.map((m) => m.model),
      this.body,
      this.floor,
      { own: own.color, losers: losers.color },
    );
    // The team stands a little left of the middle, leaving the bottom right corner to the results.
    this.room.camera.setViewOffset(1, 1, SHIFT, 0, 1, 1);
    this.room.lights.aimAt(new THREE.Vector3(0, STAGE.height, 0));
    this.room.confetti.cannons({ x: 0, y: 0, z: 0 }, { ring: 3.6, cannons: 4, count: 260, speed: 13 });
    this.room.confetti.startRain({ x: 0, y: 8, z: 0 }, 3.4, 60);
    this.room.onFrame((dt, time) => this.pose(dt, time));
    this.room.start();
  }

  dispose(): void {
    // The fighters' and guns' materials are shared with the field, so the team leaves the room before it frees the rest.
    this.body.dispose();
    this.room.scene.remove(this.team, this.floor.mesh);
    for (const m of this.members) {
      m.model.dispose();
      m.gun.dispose();
    }
    this.floor.dispose();
    this.room.dispose();
  }

  private pose(dt: number, time: number): void {
    for (const m of this.members) {
      m.animator.update(celebrating(m.gunId, m.spot, time), dt, NO_PUSH, m.spot.trophy ? liftTrophy(m.character, time) : null);
    }
    const lifter = this.members.find((m) => m.spot.trophy);
    if (lifter) {
      lifter.model.rig.handL.getWorldPosition(this.wrist);
      this.cup.position.copy(this.wrist);
      this.cup.position.y += CUP.aboveWrist;
    }
    this.floor.update(time);
  }
}
