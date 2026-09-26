import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createFighter, type Fighter } from "../../engine/fighter";
import { GUN_IDS, type GunId } from "../../engine/guns";
import { newMatch } from "../../engine/match";
import { BODY } from "../../engine/tuning";
import { CHARACTER_IDS, type CharacterId } from "../../roster";
import { buildCharacter } from "../models/character";
import { buildGun } from "../models/guns";
import { readFighter } from "./anim-input";
import { Animator } from "./animator";

const COLOURS = { team: "#ff3fc8", dark: "#6d0d56", player: "#2ed573" };

function rigFor(character: CharacterId, gun: GunId) {
  const model = buildCharacter(character, COLOURS);
  const g = buildGun(gun, COLOURS.team);
  const animator = new Animator(model.rig, g, character, 1, null);
  const f = createFighter(0, { team: 0, seat: 1, name: "Test", character, gun });
  f.pos = { x: 1, z: -2 };
  f.look = 0.4;
  f.aim = { yaw: 0.4, pitch: 0 };
  return { model, g, animator, f };
}

/** Poses a fighter for half a second of frames, so every blend has settled. */
function settle(animator: Animator, f: Fighter, time = 5): void {
  const match = newMatch();
  match.phase = "fight";
  for (let i = 0; i < 40; i++) animator.update(readFighter(f, time + i / 60, match, null), 1 / 60, { x: 0, z: -1 });
}

const worldY = (o: THREE.Object3D) => new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).y;

describe("fighter poses match the engine's hit boxes", () => {
  for (const character of CHARACTER_IDS) {
    it(`${character}: the head stands where the standing head box is, and kneels below low cover`, () => {
      const { model, animator, f } = rigFor(character, "rifle");
      f.brain.stance = "peek";
      settle(animator, f);
      expect(worldY(model.rig.head)).toBeGreaterThan(BODY.standHead - 0.1);
      expect(worldY(model.rig.head)).toBeLessThan(BODY.standHead + 0.1);
      f.crouch = 1;
      f.brain.stance = "hide";
      settle(animator, f);
      expect(Math.abs(worldY(model.rig.head) - BODY.crouchHead)).toBeLessThan(0.12);
      // Everything on the head, helmet and all, stays under the lowest bunker.
      const top = new THREE.Box3().setFromObject(model.rig.head).max.y;
      expect(top).toBeLessThan(1.1);
    });
  }

  for (const gun of GUN_IDS) {
    it(`both hands hold the ${gun}, aimed and carried`, () => {
      const { model, g, animator, f } = rigFor("operator", gun);
      for (const stance of ["peek", "move"] as const) {
        f.brain.stance = stance;
        settle(animator, f);
        const grip = new THREE.Vector3().setFromMatrixPosition(g.root.matrixWorld);
        const fore = g.fore.clone().applyMatrix4(g.root.matrixWorld);
        expect(new THREE.Vector3().setFromMatrixPosition(model.rig.handR.matrixWorld).distanceTo(grip)).toBeLessThan(0.03);
        expect(new THREE.Vector3().setFromMatrixPosition(model.rig.handL.matrixWorld).distanceTo(fore)).toBeLessThan(0.04);
      }
    });
  }

  it("keeps the feet on the turf while standing and running", () => {
    const { model, animator, f } = rigFor("pro", "smg");
    settle(animator, f);
    for (const ankle of [model.rig.ankleL, model.rig.ankleR]) expect(worldY(ankle)).toBeCloseTo(model.rig.size.ankle, 2);
    f.vel = { x: 4, z: 3 };
    f.brain.stance = "move";
    const match = newMatch();
    match.phase = "fight";
    let lowest = Infinity;
    for (let i = 0; i < 60; i++) {
      animator.update(readFighter(f, 6 + i / 60, match, null), 1 / 60, { x: 0, z: -1 });
      lowest = Math.min(lowest, worldY(model.rig.ankleL), worldY(model.rig.ankleR));
    }
    expect(lowest).toBeGreaterThan(model.rig.size.ankle - 0.03);
  });
});
