import * as THREE from "three";
import { CHARACTERS, type CharacterId } from "@/games/blade-clash/characters";
import { LOOKS } from "./looks";

/** The moving pieces of a placeholder body. Forward is +x, right is +z, the feet at the origin. */
export interface BodyParts {
  root: THREE.Group;
  /** Pivots at the hips: the torso and head lean and fall with it. */
  torso: THREE.Group;
  legs: [THREE.Object3D, THREE.Object3D];
  /** The body's own material, so a hit can flash it. */
  skin: THREE.MeshStandardMaterial;
}

const HIP = 0.9;

/**
 * A simple stand in body in the character's colours: legs, a torso, a
 * head and a band in the player's colour. Blocky for the Block Hero,
 * rounded for everyone else. Stage art replaces it later; the sizes match
 * the engine's hurtboxes so hits line up with what is drawn.
 */
export function buildBody(characterId: CharacterId, trim: number): BodyParts {
  const look = LOOKS[characterId];
  const skin = new THREE.MeshStandardMaterial({ color: look.body, roughness: 0.45, metalness: look.blocky ? 0 : 0.4 });
  const headMaterial = new THREE.MeshStandardMaterial({ color: look.head, roughness: 0.4, metalness: look.blocky ? 0 : 0.5 });
  const band = new THREE.MeshStandardMaterial({ color: trim, roughness: 0.5 });
  const root = new THREE.Group();
  const torso = new THREE.Group();
  torso.position.y = HIP;
  root.add(torso);

  const chest = look.blocky ? new THREE.BoxGeometry(0.34, 0.56, 0.42) : new THREE.CapsuleGeometry(0.2, 0.34, 6, 14);
  const chestMesh = new THREE.Mesh(chest, skin);
  chestMesh.position.y = 0.33;
  const head = look.blocky ? new THREE.BoxGeometry(0.28, 0.28, 0.28) : new THREE.SphereGeometry(0.14, 18, 14);
  const headMesh = new THREE.Mesh(head, headMaterial);
  headMesh.position.y = 0.8;
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.07, 16), band);
  belt.position.y = 0.12;
  torso.add(chestMesh, headMesh, belt);

  const leg = (side: number): THREE.Object3D => {
    const pivot = new THREE.Group();
    pivot.position.set(0, HIP, side * 0.1);
    const shape = look.blocky ? new THREE.BoxGeometry(0.14, 0.86, 0.14) : new THREE.CapsuleGeometry(0.07, 0.72, 4, 10);
    const mesh = new THREE.Mesh(shape, skin);
    mesh.position.y = -0.45;
    pivot.add(mesh);
    root.add(pivot);
    return pivot;
  };
  const legs: [THREE.Object3D, THREE.Object3D] = [leg(-1), leg(1)];

  root.traverse((child) => {
    if (child instanceof THREE.Mesh) child.castShadow = true;
  });
  return { root, torso, legs, skin };
}

/**
 * The blade, running along +y from the hand at the origin, its edge along
 * +x. Each character's weapon has its own length, width and colour, and
 * the Star Knight's glows in the player's colour.
 */
export function buildBlade(characterId: CharacterId, trim: number): THREE.Group {
  const look = LOOKS[characterId];
  const { length, radius } = CHARACTERS[characterId].blade;
  const group = new THREE.Group();
  const hilt = new THREE.MeshStandardMaterial({ color: look.hilt, roughness: 0.4, metalness: 0.6 });
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8), hilt);
  grip.position.y = 0;
  const guard = new THREE.Mesh(new THREE.BoxGeometry(look.glowing ? 0.06 : 0.22, 0.03, 0.05), hilt);
  guard.position.y = 0.1;
  const bladeLength = length - 0.1;
  const steel = look.glowing
    ? new THREE.MeshBasicMaterial({ color: look.blade, toneMapped: false })
    : new THREE.MeshStandardMaterial({ color: look.blade, roughness: 0.18, metalness: look.blocky ? 0.1 : 0.95 });
  const bladeMesh = new THREE.Mesh(look.glowing ? new THREE.CylinderGeometry(radius * 0.6, radius * 0.6, bladeLength, 10) : new THREE.BoxGeometry(radius * 2, bladeLength, 0.012), steel);
  bladeMesh.position.y = 0.1 + bladeLength / 2;
  group.add(grip, guard, bladeMesh);
  if (look.glowing) {
    const halo = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 1.4, radius * 1.4, bladeLength, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: trim, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    halo.position.y = bladeMesh.position.y;
    group.add(halo);
  }
  return group;
}
