import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { orbitPose, type OrbitShot } from "@/games/kit/victory";
import { CHARACTER_IDS } from "../../roster";
import { Animator } from "../anim/animator";
import { liftTrophy } from "../anim/victory";
import { buildCharacter } from "../models/character";
import { buildGun } from "../models/guns";
import { celebrating, CUP, floorSplats, SHIFT, STAGE, standSpots, teamShot } from "./team-stage";

const COLOURS = { team: "#ff3fc8", dark: "#6d0d56", player: "#2ed573" };
const at = (o: THREE.Object3D) => new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
/** The kit's cup is this tall before it is scaled. */
const CUP_HEIGHT = 0.41;

/**
 * The top of the lifted cup and the lifter's boots on screen over a long
 * look, as device coordinates (1 the top edge, -1 the bottom), through
 * the victory room's lens on a 16:9 screen, after the opening.
 */
function framing(character: (typeof CHARACTER_IDS)[number], count: number): { cup: number; boots: number } {
  const model = buildCharacter(character, COLOURS);
  const animator = new Animator(model.rig, buildGun("smg", COLOURS.team), character, 1, null);
  const spot = standSpots(count)[0]!;
  const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 120);
  camera.setViewOffset(1, 1, SHIFT, 0, 1, 1);
  const shot = { ...teamShot(count) } as OrbitShot;
  const seen = { cup: -1, boots: 1 };
  for (let i = 0; i < 30 * 30; i++) {
    const t = i / 30;
    animator.update(celebrating("smg", spot, t), 1 / 30, { x: 0, z: -1 }, liftTrophy(character, t));
    if (t < shot.introS) continue;
    model.rig.root.updateMatrixWorld(true);
    const { position: p, target: look } = orbitPose(shot, t);
    camera.position.set(p.x, p.y, p.z);
    camera.lookAt(look.x, look.y, look.z);
    camera.updateMatrixWorld();
    const cup = at(model.rig.handL).add(new THREE.Vector3(0, STAGE.height + CUP.aboveWrist + CUP_HEIGHT * CUP.scale, 0));
    seen.cup = Math.max(seen.cup, cup.project(camera).y);
    seen.boots = Math.min(seen.boots, new THREE.Vector3(spot.x, STAGE.height, spot.z).project(camera).y);
  }
  return seen;
}

describe("the winners' stage", () => {
  it("stands one winner in the middle with the trophy", () => {
    const spots = standSpots(1);
    expect(spots).toHaveLength(1);
    expect(spots[0]!.trophy).toBe(true);
    expect(Math.abs(spots[0]!.x) + Math.abs(spots[0]!.look)).toBeCloseTo(0);
  });

  it("puts the top scorer on the camera's left with the trophy, both turned in a little", () => {
    const [first, second] = standSpots(2);
    expect(first!.trophy).toBe(true);
    expect(second!.trophy).toBe(false);
    expect(first!.x).toBeLessThan(0);
    expect(second!.x).toBeGreaterThan(0);
    // A fighter faces +z at look 0, so turning in means a positive look on the left and negative on the right.
    expect(first!.look).toBeGreaterThan(0);
    expect(second!.look).toBeLessThan(0);
    for (const spot of [first!, second!]) expect(Math.abs(spot.x)).toBeLessThan(STAGE.radius - 0.4);
  });

  it("spatters the floor round the stage the same way every time, mostly in the losers' paint", () => {
    const splats = floorSplats(40);
    expect(floorSplats(40)).toEqual(splats);
    for (const s of splats) {
      const out = Math.hypot(s.x, s.z);
      expect(out).toBeGreaterThan(STAGE.radius);
      expect(out).toBeLessThan(STAGE.radius + 4.6);
      expect(s.size).toBeGreaterThan(0.2);
    }
    expect(splats.filter((s) => s.losers).length).toBeGreaterThan(splats.length / 2);
  });

  it("reads a celebrating winner as standing still, alive and just won", () => {
    const input = celebrating("rifle", { x: 1, z: 0, look: 0.2, trophy: false }, 3);
    expect(input).toMatchObject({ now: 3, x: 1, look: 0.2, speed: 0, alive: true, wonAt: 0, reloading: false });
  });

  for (const character of CHARACTER_IDS) {
    it(`${character}: lifts the cup over the head in the left hand, the gun still in the right`, () => {
      const model = buildCharacter(character, COLOURS);
      const gun = buildGun("smg", COLOURS.team);
      const animator = new Animator(model.rig, gun, character, 1, null);
      const spot = standSpots(1)[0]!;
      for (let i = 0; i < 90; i++) animator.update(celebrating("smg", spot, i / 30), 1 / 30, { x: 0, z: -1 }, liftTrophy(character, i / 30));
      model.rig.root.updateMatrixWorld(true);
      expect(at(model.rig.handL).y).toBeGreaterThan(at(model.rig.head).y + 0.15);
      expect(at(model.rig.handR).distanceTo(at(gun.root))).toBeLessThan(0.05);
    });
  }

  for (const character of CHARACTER_IDS) {
    it(`${character}: keeps the lifted cup under the names and the boots in the picture, alone or with a teammate`, () => {
      // One winner's name is bigger, so the names reach further down: to about 38% of the screen, or 33% for a team.
      const alone = framing(character, 1);
      expect(alone.cup).toBeLessThan(0.2);
      expect(alone.boots).toBeGreaterThan(-0.96);
      const team = framing(character, 2);
      expect(team.cup).toBeLessThan(0.3);
      expect(team.boots).toBeGreaterThan(-0.96);
    });
  }
});
