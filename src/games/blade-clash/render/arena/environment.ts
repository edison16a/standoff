import * as THREE from "three";
import type { ArenaTheme } from "./arena-theme";

/**
 * What shiny things reflect: the sky over the arena, bright near the sun
 * by day, with the warm stone of the stands all round below it. At night
 * a dark sky with the spotlight overhead and the braziers' fire low down,
 * so armour and blades catch hard highlights out of the dark.
 */
export function arenaEnvironment(renderer: THREE.WebGLRenderer, theme: ArenaTheme): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const scene = new THREE.Scene();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(40, 24, 12), new THREE.MeshBasicMaterial({ color: theme.horizon, side: THREE.BackSide }));
  scene.add(shell);
  const add = (color: number, strength: number, size: [number, number, number], at: [number, number, number]) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength) }));
    mesh.position.set(...at);
    scene.add(mesh);
  };
  // The sky overhead and the stands' stone all round the lower half.
  add(theme.zenith, theme.dark ? 1 : 1.6, [80, 1, 80], [0, 30, 0]);
  add(new THREE.Color(theme.stone).getHex(), theme.dark ? 0.25 : 0.9, [80, 12, 1], [0, 2, -30]);
  add(new THREE.Color(theme.stone).getHex(), theme.dark ? 0.25 : 0.9, [80, 12, 1], [0, 2, 30]);
  add(new THREE.Color(theme.stone).getHex(), theme.dark ? 0.25 : 0.9, [1, 12, 80], [30, 2, 0]);
  add(new THREE.Color(theme.stone).getHex(), theme.dark ? 0.25 : 0.9, [1, 12, 80], [-30, 2, 0]);
  add(new THREE.Color(theme.sand).getHex(), theme.dark ? 0.2 : 0.8, [80, 1, 80], [0, -8, 0]);
  if (theme.dark) {
    add(0xfff1dc, 30, [3, 0.5, 3], [1.5, 20, 2.5]);
    for (const x of [-20, 20]) add(0xff8a3a, 8, [2, 3, 6], [x, 3, 0]);
  } else {
    add(0xfff3d0, 40, [6, 6, 6], [-15, 30, 20]);
  }
  const texture = pmrem.fromScene(scene, 0.04).texture;
  pmrem.dispose();
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      (object.material as THREE.Material).dispose();
    }
  });
  return texture;
}
