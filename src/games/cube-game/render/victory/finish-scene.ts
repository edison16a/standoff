import * as THREE from "three";
import { createCupTrophy, createPedestal, createPodium, VictoryRoom, type Metal } from "@/games/kit/victory";
import type { PlayerState } from "../../engine/player";
import { Avatar } from "../avatar";
import { SKINS } from "../game-renderer";
import { themeFor } from "../themes";
import { finishShot, hop, type Stand } from "./finish-stage";

interface Cube {
  avatar: Avatar;
  state: PlayerState;
  /** Where the cube rests, in the world: the middle of the cube. */
  rest: THREE.Vector3;
  hops: boolean;
  /** Seconds ahead in the hop, so two winners do not hop in step. */
  lead: number;
  airborne: boolean;
}

/** Half the cube's side: it rests this far over the surface under it. */
const HALF = 0.46;
const hex = (colour: number) => `#${colour.toString(16).padStart(6, "0")}`;

function standing(): PlayerState {
  return { x: 0, y: 0, vy: 0, mode: "cube", gravity: 1, grounded: true, angle: 0, speed: 0, buffer: 0, coyote: 0, usedPads: new Set(), usedOrbs: new Set(), dead: false, finished: true };
}

/**
 * The end of a round in the victory kit's own room, lit in the level's
 * colours: a race's winner hopping on the podium's top step beside a
 * gold cup and the other player second with silver, or a player alone
 * celebrating the finish on a pedestal, under spotlights and confetti.
 */
export class FinishScene {
  private readonly room: VictoryRoom;
  private readonly cubes: Cube[] = [];

  constructor(holder: HTMLElement, stand: Stand, levelId: string) {
    const theme = themeFor(levelId);
    const cheering = stand.kind === "podium" ? stand.places.some((p) => p.cup) : stand.cup;
    const skins = SKINS.flatMap((skin) => [hex(skin.main), hex(skin.trim)]);
    this.room = new VictoryRoom(holder, {
      background: hex(theme.skyHigh),
      floorColour: hex(theme.fill),
      lights: { count: 4, colours: ["#fff1d6", hex(theme.edge), "#ffd27a", hex(theme.accent)], radius: 5, height: 9.5, intensity: 650, angle: 0.24, beamStrength: 0.24 },
      confetti: { count: 1600, size: 0.06, colours: [...skins, hex(theme.edge), hex(theme.accent), "#ffffff"], seed: 13 },
      orbit: finishShot(stand),
    });
    if (stand.kind === "podium") this.podium(stand.places);
    else this.pedestal(stand.slots, stand.cup);
    // The celebration sits a little right of the middle, leaving the bottom left corner to the results.
    this.room.camera.setViewOffset(1, 1, stand.kind === "podium" ? -0.12 : -0.06, 0, 1, 1);
    this.room.lights.aimAt(new THREE.Vector3(0, 1, 0));
    if (cheering) {
      this.room.confetti.cannons({ x: 0, y: 0, z: 0 }, { ring: 4.2, cannons: 4, count: 260, speed: 14 });
      this.room.confetti.startRain({ x: 0, y: 9, z: 0 }, 4, 90);
    }
    this.room.onFrame((dt, time) => this.animate(dt, time));
    this.room.start();
  }

  dispose(): void {
    for (const cube of this.cubes) {
      this.room.scene.remove(cube.avatar.group);
      cube.avatar.dispose();
    }
    this.room.dispose();
  }

  /** The race: the winner on the top step and the other second, each with a cup when anyone finished. */
  private podium(places: Extract<Stand, { kind: "podium" }>["places"]): void {
    const podium = createPodium({ width: 1.8, height: 1.2 });
    this.room.scene.add(podium.object);
    this.room.scene.updateMatrixWorld(true);
    for (const p of places) {
      const top = podium.topOf(p.place);
      this.cube(p.slot, top.clone().add(new THREE.Vector3(0, HALF, -0.2)), p.place === 1, 0);
      if (p.cup) this.cup(p.cup, top.clone().add(new THREE.Vector3(0.55, 0, 0.5)), p.place === 1 ? 1.6 : 1.3);
    }
  }

  /** One player alone, or a dead heat side by side, on a round pedestal with the gold cup in front. */
  private pedestal(slots: readonly number[], cup: boolean): void {
    const pedestal = createPedestal({ radius: 1.35, height: 0.85 });
    this.room.scene.add(pedestal);
    const top = pedestal.userData.top as number;
    slots.forEach((slot, i) => {
      const x = slots.length === 1 ? 0 : i === 0 ? -0.62 : 0.62;
      this.cube(slot, new THREE.Vector3(x, top + HALF, -0.25), true, i * 0.8);
    });
    if (cup) this.cup("gold", new THREE.Vector3(slots.length === 1 ? 0.62 : 0, top, 0.55), 1.6);
  }

  private cube(slot: number, rest: THREE.Vector3, hops: boolean, lead: number): void {
    const avatar = new Avatar(SKINS[(slot - 1) % SKINS.length]!);
    this.room.scene.add(avatar.group);
    this.cubes.push({ avatar, state: standing(), rest, hops, lead, airborne: false });
  }

  private cup(metal: Metal, at: THREE.Vector3, scale: number): void {
    const cup = createCupTrophy({ metal });
    cup.scale.setScalar(scale);
    cup.position.copy(at);
    this.room.scene.add(cup);
  }

  private animate(dt: number, time: number): void {
    for (const cube of this.cubes) {
      const { lift, angle } = cube.hops ? hop(time + cube.lead) : { lift: 0, angle: 0 };
      cube.state.x = cube.rest.x;
      cube.state.y = cube.rest.y + lift;
      cube.state.angle = angle;
      cube.avatar.update(cube.state, dt);
      // The avatar stands on the line z = 0 of its own group, so the group carries the depth.
      cube.avatar.group.position.z = cube.rest.z;
      if (cube.airborne && lift === 0) cube.avatar.land();
      cube.airborne = lift > 0;
    }
  }
}
