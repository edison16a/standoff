import * as THREE from "three";
import { box, cyl, merge, paint, rod } from "../geo";
import { FIELD_COLOURS as C } from "../palette";
import { GROUND, netTexture } from "../textures";

const NET_HEIGHT = 7;
const POST_EVERY = 6;

/**
 * The tall safety nets round the field on steel posts, with a padded
 * skirt at the bottom and flags on the corner posts. The net is a tiled
 * see through texture, so the stands show through it.
 */
export function buildNetting(): { group: THREE.Group; dispose(): void } {
  const group = new THREE.Group();
  const hw = GROUND.halfWidth - 0.5;
  const hl = GROUND.halfLength - 0.5;
  const sides: [number, number, number, number][] = [
    [-hw, -hl, hw, -hl],
    [hw, -hl, hw, hl],
    [hw, hl, -hw, hl],
    [-hw, hl, -hw, -hl],
  ];
  const tex = netTexture();
  const netMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 0.85 });
  const parts: THREE.BufferGeometry[] = [];
  const nets: THREE.Mesh[] = [];
  for (const [x0, z0, x1, z1] of sides) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const geo = new THREE.PlaneGeometry(len, NET_HEIGHT);
    // Ten centimetre squares.
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len * 6, uv.getY(i) * NET_HEIGHT * 6);
    const net = new THREE.Mesh(geo, netMat);
    net.position.set((x0 + x1) / 2, NET_HEIGHT / 2, (z0 + z1) / 2);
    net.rotation.y = Math.atan2(x1 - x0, z1 - z0) - Math.PI / 2;
    net.renderOrder = 2;
    nets.push(net);
    const posts = Math.round(len / POST_EVERY);
    for (let i = 0; i <= posts; i++) {
      const t = i / posts;
      const x = x0 + (x1 - x0) * t;
      const z = z0 + (z1 - z0) * t;
      parts.push(paint(cyl(0.06, 0.07, NET_HEIGHT + 0.3, 8), C.netPost, { at: [x, (NET_HEIGHT + 0.3) / 2, z] }));
    }
    // A padded skirt along the bottom, in the field's lime.
    parts.push(paint(box(len, 0.6, 0.08), C.lime, { at: [(x0 + x1) / 2, 0.3, (z0 + z1) / 2], rot: [0, net.rotation.y, 0] }));
    // The top cable.
    parts.push(rod([x0, NET_HEIGHT, z0], [x1, NET_HEIGHT, z1], 0.02, C.netPost, 4));
  }
  for (const [x, z, colour] of [[-hw, -hl, "#ff3fc8"], [hw, -hl, "#16d9ff"], [hw, hl, "#ff3fc8"], [-hw, hl, "#16d9ff"]] as const) {
    parts.push(paint(box(0.04, 0.9, 1.4), colour, { at: [x, NET_HEIGHT + 0.1, z + (z < 0 ? 0.75 : -0.75)] }));
  }
  const frameMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.3 });
  const frame = new THREE.Mesh(merge(parts), frameMat);
  frame.castShadow = true;
  group.add(frame, ...nets);
  return {
    group,
    dispose() {
      frame.geometry.dispose();
      frameMat.dispose();
      for (const net of nets) net.geometry.dispose();
      netMat.dispose();
      tex.dispose();
    },
  };
}
