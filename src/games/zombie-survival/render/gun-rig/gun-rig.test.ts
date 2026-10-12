import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { WEAPON_IDS, WEAPONS } from "../../engine/weapons";
import { PART } from "../models/guns/moving-parts";
import { GunRig } from "./gun-rig";

// Gun textures are painted on a canvas, which node has not got. Plain textures do for these checks.
vi.mock("../surfaces", () => ({ scuffs: () => new THREE.Texture(), wood: () => new THREE.Texture() }));

/** A rig held in a camera space group, as the first person view holds it. */
function held(weapon: (typeof WEAPON_IDS)[number]) {
  const camera = new THREE.Group();
  const rig = new GunRig(weapon, 0xff0000);
  camera.add(rig.holder);
  rig.place(0.2, -0.25, -0.43);
  rig.pointAt(new THREE.Vector3(0, 0, -10));
  const run = (seconds: number) => {
    for (let t = 0; t < seconds; t += 1 / 60) rig.update(1 / 60, t);
  };
  return { rig, run };
}

const named = (rig: GunRig, name: string) => rig.model.root.getObjectByName(name)!;

describe("the gun rig", () => {
  it("builds every gun with its moving parts and a pair of hands", () => {
    for (const weapon of WEAPON_IDS) {
      const { rig, run } = held(weapon);
      run(0.1);
      expect(named(rig, PART.portSlide), weapon).toBeDefined();
      // Two hands, each with a palm and fifteen finger and thumb segments, and two forearms.
      let meshes = 0;
      rig.holder.traverse((o) => o instanceof THREE.Mesh && meshes++);
      expect(meshes).toBeGreaterThan(30);
      rig.dispose();
    }
  });

  it("drops a tumbling copy of the empty magazine that falls away from the gun", () => {
    const { rig, run } = held("rifle");
    run(0.2);
    rig.startReload(WEAPONS.rifle.reload, true);
    const before = rig.holder.children.length;
    run(0.25);
    // The copy hangs off the holder's debris group, not the gun.
    const debris = rig.holder.children.find((c) => c !== rig.holder.children[0])!;
    expect(rig.holder.children.length).toBe(before);
    expect(debris.children).toHaveLength(1);
    const y0 = debris.children[0]!.position.y;
    run(0.2);
    expect(debris.children[0]!.position.y).toBeLessThan(y0 - 0.1);
    run(1);
    expect(debris.children).toHaveLength(0);
    rig.dispose();
  });

  it("opens the port on a shot and locks the AR open on its last round", () => {
    const { rig, run } = held("rifle");
    run(0.1);
    const slide = named(rig, PART.portSlide);
    rig.fire(0);
    rig.update(1 / 60, 0);
    expect(slide.scale.z).toBeLessThan(0.5);
    run(0.5);
    expect(slide.scale.z).toBeLessThan(0.5);
    rig.fire(3);
    run(0.5);
    expect(slide.scale.z).toBe(1);
    rig.dispose();
  });

  it("never moves the aim: a shot kicks the gun and it springs back to the same place", () => {
    const { rig, run } = held("ak47");
    run(1);
    const at = new THREE.Vector3();
    const dir = new THREE.Vector3();
    rig.holder.updateMatrixWorld(true);
    rig.muzzle(at, dir);
    const rest = dir.clone();
    rig.fire(10);
    run(0.05);
    rig.holder.updateMatrixWorld(true);
    rig.muzzle(at, dir);
    expect(dir.angleTo(rest)).toBeGreaterThan(0.02);
    run(2);
    rig.holder.updateMatrixWorld(true);
    rig.muzzle(at, dir);
    expect(dir.angleTo(rest)).toBeLessThan(0.02);
    rig.dispose();
  });
});
