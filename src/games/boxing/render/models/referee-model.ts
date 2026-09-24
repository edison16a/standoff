import * as THREE from "three";
import { BoxerModel } from "./boxer-model";
import type { Look } from "./looks";

/** The third man in the ring. Only the face, hair and shoes come from the look. */
export const REFEREE_LOOK: Look = {
  id: "referee",
  name: "Referee",
  nickname: "",
  from: "",
  skin: "#d5a383",
  skinShade: "#a87458",
  hair: "#8d8d8d",
  hairStyle: "buzz",
  beard: "stubble",
  eyes: "#3a4a5a",
  trunks: "#16161a",
  trim: "#16161a",
  gloves: "#d5a383",
  gloveTrim: "#16161a",
  shoes: "#111114",
  socks: "#16161a",
  bulk: 0.92,
  height: 1.03,
};

/**
 * The referee, built on the boxer's body and dressed for the job: a
 * white short sleeved shirt, a black bow tie, black trousers and shoes,
 * and bare hands in place of gloves.
 */
export function buildReferee(): BoxerModel {
  const model = new BoxerModel(REFEREE_LOOK);
  const shirt = new THREE.MeshStandardMaterial({ color: "#f4f5f8", roughness: 0.75 });
  const trousers = new THREE.MeshStandardMaterial({ color: "#141418", roughness: 0.65 });
  const dress = (root: THREE.Object3D, material: THREE.Material, stop?: THREE.Object3D) => {
    root.traverse((object) => {
      if (object instanceof THREE.Mesh && !isUnder(object, stop)) object.material = material;
    });
  };
  // The shirt covers the chest, the belly and the upper arms as short sleeves.
  for (const child of [...model.chest.children, ...model.spine.children]) {
    if (child instanceof THREE.Mesh) child.material = shirt;
  }
  for (const hand of ["left", "right"] as const) {
    const arm = model.arms[hand];
    dress(arm.root, shirt, arm.middle);
    // Bare fists instead of gloves.
    for (const child of arm.end.children) child.visible = false;
    const fist = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), model.materials.skin);
    fist.scale.set(0.9, 1.2, 0.8);
    fist.position.y = -0.05;
    fist.castShadow = true;
    arm.end.add(fist);
    const leg = model.legs[hand];
    dress(leg.root, trousers);
    // Trousers run straight down: the flared trunk leg a boxer wears on each thigh is hidden.
    const flare = leg.root.children[0]?.children[1];
    if (flare) flare.visible = false;
  }
  for (const child of model.hips.children) {
    if (child !== model.spine) dress(child, trousers);
  }
  const tie = new THREE.Group();
  const knot = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.015), trousers);
  tie.add(knot);
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.045, 4), trousers);
    wing.rotation.z = (side * Math.PI) / 2;
    wing.position.x = side * 0.026;
    tie.add(wing);
  }
  tie.position.set(0, 0.29, 0.085);
  model.chest.add(tie);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 20), shirt);
  collar.rotation.x = Math.PI / 2 - 0.2;
  collar.position.set(0, 0.315, 0.005);
  model.chest.add(collar);
  return model;
}

function isUnder(object: THREE.Object3D, stop?: THREE.Object3D): boolean {
  if (!stop) return false;
  for (let o: THREE.Object3D | null = object; o; o = o.parent) if (o === stop) return true;
  return false;
}
