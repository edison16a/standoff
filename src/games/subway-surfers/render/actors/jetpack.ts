import * as THREE from "three";
import { MeshBuilder } from "../mesh-builder";
import { addOutline } from "../outline";

/** The jetpack on the runner's back: two orange tanks with nozzles, and a flame under each that flickers. */
export function buildJetpack(): THREE.Group {
  const b = new MeshBuilder();
  for (const x of [-0.1, 0.1]) {
    b.capsule(0.08, 0.26, { color: 0xff8a1f, finish: "gloss" }, [x, 0, 0.06]);
    b.post(0.06, 0.08, { color: 0x5b6270, finish: "metal" }, [x, -0.24, 0.06], 10, 0.08);
  }
  b.box(0.3, 0.3, 0.1, { color: 0x5b6270, finish: "satin" }, [0, 0.02, -0.02], undefined, 0.03);
  const group = b.build("jetpack");
  addOutline(group);
  const flame = new MeshBuilder();
  for (const x of [-0.1, 0.1]) {
    flame.add(new THREE.ConeGeometry(0.07, 0.5, 10), { color: 0xffb627, finish: "glow" }, [x, -0.5, 0.06], [Math.PI, 0, 0]);
    flame.add(new THREE.ConeGeometry(0.04, 0.3, 8), { color: 0xfff3c4, finish: "glow" }, [x, -0.42, 0.06], [Math.PI, 0, 0]);
  }
  const fire = flame.build("flame");
  fire.name = "flame";
  group.add(fire);
  return group;
}
