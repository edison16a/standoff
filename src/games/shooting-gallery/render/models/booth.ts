import * as THREE from "three";
import { BOOTH, LANES } from "../../engine/layout";
import { grainTexture, stripeTexture } from "../textures";

/**
 * The fixed shell of the booth: the striped cloth wall, the tent ceiling,
 * the floor, the side walls, the plate rail and the wooden counter. The
 * canopy, posts, bulbs and waves are built in their own files.
 */

/** Width of one cloth stripe, in metres. */
const STRIPE = 0.42;
const WIDE = BOOTH.halfWidth * 2 + 0.4;

/**
 * The back wall hangs like cloth: each stripe bellies out a little and
 * creases at its seams, so the key light models every stripe.
 */
function wall(stripes: THREE.Texture): THREE.Mesh {
  const height = BOOTH.topY + 0.2;
  const geometry = new THREE.PlaneGeometry(WIDE, height, 220, 1);
  const p = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setZ(i, 0.035 * Math.abs(Math.sin((Math.PI * (p.getX(i) + WIDE / 2)) / STRIPE)));
  geometry.computeVertexNormals();
  const map = stripes.clone();
  map.repeat.set(WIDE / (STRIPE * 2), 1);
  map.needsUpdate = true;
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map, roughness: 0.92 }));
  mesh.position.set(0, height / 2, BOOTH.wallZ);
  mesh.receiveShadow = true;
  return mesh;
}

/** The underside of the tent roof, stripes running toward the players. */
function ceiling(stripes: THREE.Texture): THREE.Mesh {
  const depth = 3.8;
  const geometry = new THREE.PlaneGeometry(WIDE + 1, depth, 1, 1);
  const map = stripes.clone();
  map.repeat.set((WIDE + 1) / (STRIPE * 2.4), 1);
  map.needsUpdate = true;
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map, roughness: 0.95, color: "#d8cfc4" }));
  mesh.rotation.x = Math.PI / 2 - 0.05;
  mesh.position.set(0, BOOTH.topY + 0.1, BOOTH.wallZ + depth / 2);
  return mesh;
}

/** Side walls, slightly darker than the back, closing the booth off at each post. */
function sides(stripes: THREE.Texture): THREE.Mesh[] {
  const depth = 4;
  return [-1, 1].map((side) => {
    const map = stripes.clone();
    map.repeat.set(depth / (STRIPE * 2), 1);
    map.needsUpdate = true;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(depth, BOOTH.topY + 0.2), new THREE.MeshStandardMaterial({ map, color: "#bdb3aa", roughness: 0.95 }));
    mesh.rotation.y = -side * (Math.PI / 2);
    mesh.position.set(side * (BOOTH.halfWidth + 0.15), (BOOTH.topY + 0.2) / 2, BOOTH.wallZ + depth / 2);
    mesh.receiveShadow = true;
    return mesh;
  });
}

function floor(): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(WIDE + 1, 5), new THREE.MeshStandardMaterial({ color: "#2a1a14", roughness: 1 }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, 0, BOOTH.wallZ + 2.5);
  return mesh;
}

/** The steel rail the plates ride along, held off the wall by brackets. */
function rail(): THREE.Group {
  const lane = LANES.rail;
  const group = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: "#a7adb4", metalness: 0.9, roughness: 0.3 });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, WIDE + 1, 16), steel);
  tube.rotation.z = Math.PI / 2;
  tube.position.set(0, lane.y + 0.01, lane.z);
  tube.castShadow = true;
  group.add(tube);
  const reach = lane.z - BOOTH.wallZ;
  for (let x = -BOOTH.halfWidth + 0.4; x <= BOOTH.halfWidth; x += 1.45) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, reach), steel);
    arm.position.set(x, lane.y + 0.01, lane.z - reach / 2);
    arm.castShadow = true;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.015), steel);
    foot.position.set(x, lane.y + 0.01, BOOTH.wallZ + 0.04);
    group.add(arm, foot);
  }
  return group;
}

/** The counter the players lean on: a thick top board with a rounded nose over a planked front. */
function counter(): THREE.Group {
  const group = new THREE.Group();
  const grain = grainTexture(21);
  grain.repeat.set(3, 1);
  const top = new THREE.MeshStandardMaterial({ color: "#9a5b2c", map: grain, roughness: 0.5 });
  const front = new THREE.MeshStandardMaterial({ color: "#6e3b1c", map: grain, roughness: 0.7 });
  const depth = 0.62;
  const board = new THREE.Mesh(new THREE.BoxGeometry(WIDE + 1, 0.07, depth), top);
  board.position.set(0, BOOTH.counterTopY - 0.035, BOOTH.counterZ + depth / 2);
  board.receiveShadow = true;
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, WIDE + 1, 20), top);
  nose.rotation.z = Math.PI / 2;
  nose.position.set(0, BOOTH.counterTopY - 0.035, BOOTH.counterZ + depth);
  group.add(board, nose);
  // Vertical planks with a dark gap between each.
  for (let x = -WIDE / 2 - 0.5; x < WIDE / 2 + 0.5; x += 0.3) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.6, 0.04), front);
    plank.position.set(x + 0.15, BOOTH.counterTopY - 0.9, BOOTH.counterZ + depth - 0.03);
    group.add(plank);
  }
  const gap = new THREE.Mesh(new THREE.PlaneGeometry(WIDE + 1, 1.6), new THREE.MeshBasicMaterial({ color: "#1a0d07" }));
  gap.position.set(0, BOOTH.counterTopY - 0.9, BOOTH.counterZ + depth - 0.06);
  group.add(gap);
  return group;
}

export function createBooth(): THREE.Group {
  const stripes = stripeTexture();
  const group = new THREE.Group();
  group.add(wall(stripes), ceiling(stripes), ...sides(stripes), floor(), rail(), counter());
  return group;
}
