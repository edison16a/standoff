import * as THREE from "three";
import type { BodySplats } from "../effects/body-splats";
import type { Splats } from "../effects/splats";
import type { CharacterModel } from "../models/character";
import { floorSplats, seeded, STAGE } from "./team-stage";

const UP = new THREE.Vector3(0, 1, 0);
const at = new THREE.Vector3();
const from = new THREE.Vector3();
const facing = new THREE.Vector3();

/** Hits each winner takes, and splats on the stage's own top. */
const HITS = 8;
const ON_STAGE = 7;

/**
 * Paint on the winners and all round them, as if the last round was
 * fought right here. Each winner carries a few splats in the losers'
 * colour on the mask, the vest, the arms and the legs, wrapped round the
 * part so they ride every move; the floor and the stage are spattered
 * in both colours. Call once the winners are posed.
 */
export function paintTheScene(models: readonly CharacterModel[], body: BodySplats, floor: Splats, colours: { own: string; losers: string }): void {
  const random = seeded(11);
  models.forEach((model, index) => {
    const rig = model.rig;
    const parts = [rig.head, rig.chest, rig.chest, rig.spine, rig.elbowL, rig.elbowR, rig.kneeL, rig.kneeR];
    rig.root.getWorldDirection(facing);
    for (let i = 0; i < HITS; i++) {
      parts[Math.floor(random() * parts.length)]!.getWorldPosition(at);
      at.x += (random() - 0.5) * 0.12;
      at.y += (random() - 0.5) * 0.12;
      // Shots come in from the front, where the camera is, a little from either side.
      from.copy(at).addScaledVector(facing, 2.5).add(new THREE.Vector3((random() - 0.5) * 2.4, (random() - 0.4) * 0.8, 0));
      body.frame();
      body.add(index, model.meshes, from, at, random() < 0.8 ? colours.losers : colours.own, 0.1 + random() * 0.07, random(), random());
    }
  });
  for (const s of floorSplats(34)) {
    floor.add(at.set(s.x, 0.002, s.z), UP, s.losers ? colours.losers : colours.own, s.size, s.pick, s.spin, 0);
  }
  for (let i = 0; i < ON_STAGE; i++) {
    const angle = random() * Math.PI * 2;
    const out = (0.35 + random() * 0.6) * STAGE.radius;
    floor.add(at.set(Math.sin(angle) * out, STAGE.height + 0.002, Math.cos(angle) * out), UP, random() < 0.6 ? colours.losers : colours.own, 0.35 + random() * 0.4, random(), random(), 0);
  }
}
