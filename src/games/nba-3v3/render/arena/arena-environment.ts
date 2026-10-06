import * as THREE from "three";
import { TEAMS } from "../../roster";

/** Where the environment is seen from: chest height over the middle of the half court. */
const EYE = new THREE.Vector3(0, 1.4, 5);

function glow(colour: THREE.ColorRepresentation, strength: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(colour).multiplyScalar(strength), side: THREE.DoubleSide });
}

/**
 * The light every glossy surface sees: a small stand in for the arena
 * drawn once into a prefiltered environment map. Banks of lamps ring the
 * roof, the scoreboard glows over centre court, the LED ribbons run
 * round the stands in the team colours, the stands are a dim warm mass,
 * and the maple floor throws warm light back up. The ball, the rim, the
 * glass, the kits and the floor all reflect it, and it lights the
 * shadow side of everything with the arena's own colours.
 */
export function arenaEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  const owned: THREE.Material[] = [];
  const geos: THREE.BufferGeometry[] = [];
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, ry = 0, rx = 0): THREE.Mesh => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0);
    scene.add(m);
    geos.push(geo);
    owned.push(mat);
    return m;
  };
  // The bowl: a dark roof and walls, with the stands a dim warm band round the middle.
  add(new THREE.SphereGeometry(40, 32, 16), new THREE.MeshBasicMaterial({ color: "#05070d", side: THREE.BackSide }), 0, 0, 5);
  add(new THREE.CylinderGeometry(22, 14, 9, 48, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color("#8a7468").multiplyScalar(0.5), side: THREE.BackSide }), 0, 4.5, 5);
  // The floor, lit by the lamps, bounces warm light up into the players' undersides.
  add(new THREE.CircleGeometry(16, 48), glow("#c08a55", 0.55), 0, 0, 5, 0, -Math.PI / 2);
  // The LED ribbons: one low ring at courtside, one on the deck's face.
  const ribbon = [TEAMS[0].color, "#ffffff", TEAMS[1].color, "#facc15"];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const colour = ribbon[i % ribbon.length]!;
    add(new THREE.PlaneGeometry(6, 0.7), glow(colour, 1.6), Math.sin(a) * 13, 0.45, 5 + Math.cos(a) * 13, a + Math.PI);
    add(new THREE.PlaneGeometry(9, 0.9), glow(colour, 1.2), Math.sin(a) * 21, 8.6, 5 + Math.cos(a) * 21, a + Math.PI);
  }
  // Two rings of lamp banks in the roof, pointing down at the court: what makes the long highlights on the floor and the ball.
  const lamp = glow("#fff3e2", 26);
  for (const [ring, count, r] of [[0, 10, 7], [1, 16, 13]] as const) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + ring * 0.2;
      add(new THREE.PlaneGeometry(1.8, 0.7), lamp, Math.sin(a) * r, 19 + ring * 2, 5 + Math.cos(a) * r, a, Math.PI / 2);
    }
  }
  // The scoreboard over centre court.
  add(new THREE.BoxGeometry(5, 3, 5), glow("#9fb7ff", 2.2), 0, 13, 5.5);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(scene, 0.03, 0.1, 100, { position: EYE }).texture;
  pmrem.dispose();
  for (const g of new Set(geos)) g.dispose();
  for (const m of new Set(owned)) m.dispose();
  return texture;
}
