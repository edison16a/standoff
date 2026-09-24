import * as THREE from "three";
import { MeshBuilder } from "../../mesh-builder";
import { glowTexture } from "../../textures";

export interface Helicopter {
  root: THREE.Group;
  rotor: THREE.Group;
  tailRotor: THREE.Group;
  /** Where smoke pours out once the engine catches fire. */
  exhaust: THREE.Object3D;
  beacons: THREE.Sprite[];
  searchlight: THREE.Mesh;
}

/**
 * The rescue chopper: a rounded cabin with a glass nose, engine housing,
 * a long tail boom with fin and tail rotor, skids, four main blades,
 * blinking navigation lights and a searchlight sweeping the roof. It
 * faces +x.
 */
export function buildHelicopter(): Helicopter {
  const b = new MeshBuilder();
  const body = new THREE.MeshStandardMaterial({ color: 0x2a3a2c, metalness: 0.5, roughness: 0.45 });
  const stripe = new THREE.MeshStandardMaterial({ color: 0xc8c8c0, metalness: 0.3, roughness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x151618, metalness: 0.6, roughness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1a2a38, metalness: 0.8, roughness: 0.08, emissive: 0x0a1418 });

  b.box(4.6, 2, 2.2, body, [0, 1.6, 0], undefined, 0.6);
  b.sphere(1.15, glass, [2.3, 1.55, 0], [1.2, 0.85, 0.95], 16);
  b.box(3, 0.9, 1.6, body, [-0.6, 2.9, 0], undefined, 0.3);
  b.box(4.62, 0.2, 2.22, stripe, [0, 1.3, 0]);
  b.box(1.4, 1.1, 0.05, glass, [0.3, 1.8, 1.11]);
  b.box(1.4, 1.1, 0.05, glass, [0.3, 1.8, -1.11]);
  b.box(5.6, 0.5, 0.45, body, [-4.8, 2.2, 0], [0, 0, 0.06]);
  b.box(1.3, 1.6, 0.14, body, [-7.4, 2.9, 0], [0, 0, 0.35]);
  b.box(0.9, 0.12, 1.6, body, [-6.9, 2.3, 0]);
  for (const z of [-0.95, 0.95]) {
    b.box(4, 0.1, 0.1, dark, [0.2, 0.15, z]);
    for (const x of [-0.9, 1.2]) b.box(0.08, 0.7, 0.08, dark, [x, 0.5, z], [z > 0 ? -0.3 : 0.3, 0, 0]);
  }
  b.post(0.14, 0.5, dark, [0, 3.5, 0], 10);
  const root = new THREE.Group();
  root.add(b.build("helicopter"));

  const rotor = new THREE.Group();
  const rb = new MeshBuilder();
  for (let i = 0; i < 4; i++) rb.box(5.2, 0.05, 0.32, dark, [Math.cos((i * Math.PI) / 2) * 2.6, 0, Math.sin((i * Math.PI) / 2) * 2.6], [0, (-i * Math.PI) / 2, 0.04]);
  rb.post(0.3, 0.25, dark, [0, 0, 0], 12);
  rotor.add(rb.build("rotor"));
  rotor.position.set(0, 3.8, 0);
  root.add(rotor);

  const tailRotor = new THREE.Group();
  const tb = new MeshBuilder();
  for (let i = 0; i < 2; i++) tb.box(0.1, 1.5, 0.05, dark, [0, 0, 0], [0, 0, (i * Math.PI) / 2]);
  tailRotor.add(tb.build("tail-rotor"));
  tailRotor.position.set(-7.5, 3, 0.2);
  root.add(tailRotor);

  const exhaust = new THREE.Object3D();
  exhaust.position.set(-1.8, 3, 0);
  root.add(exhaust);

  const glow = glowTexture();
  const beacons = [[2, 1.2, 1.15, 0x30ff50], [2, 1.2, -1.15, 0xff3030], [-7.9, 3.6, 0, 0xffffff]].map(([x, y, z, c]) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.position.set(x!, y!, z!);
    s.scale.setScalar(1.6);
    root.add(s);
    return s;
  });
  // The searchlight: a long faint cone from under the nose.
  const cone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 5, 26, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xe8f0ff, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  cone.geometry.translate(0, -13, 0);
  cone.position.set(2.4, 0.9, 0);
  cone.rotation.z = 0.55;
  root.add(cone);
  return { root, rotor, tailRotor, exhaust, beacons, searchlight: cone };
}
