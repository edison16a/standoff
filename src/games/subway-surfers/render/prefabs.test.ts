import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { prefab, release, spareCount } from "./prefabs";

function box(): THREE.Group {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
  return group;
}

describe("the prefab pool", () => {
  it("builds a prefab once and hands out copies that share its geometry", () => {
    let builds = 0;
    const make = () => {
      builds++;
      return box();
    };
    const a = prefab("pool-share", make);
    const b = prefab("pool-share", make);
    expect(builds).toBe(1);
    expect(a).not.toBe(b);
    expect((a.children[0] as THREE.Mesh).geometry).toBe((b.children[0] as THREE.Mesh).geometry);
    expect(a.children[0]!.userData.sharedGeometry).toBe(true);
  });

  it("reuses a copy given back, reset to the origin and shown again", () => {
    const parent = new THREE.Group();
    const a = prefab("pool-reuse", box);
    parent.add(a);
    a.position.set(3, 4, 5);
    a.rotation.set(1, 2, 3);
    a.visible = false;
    release(a);
    expect(a.parent).toBeNull();
    expect(spareCount("pool-reuse")).toBe(1);
    const b = prefab("pool-reuse", box);
    expect(b).toBe(a);
    expect(b.position.toArray()).toEqual([0, 0, 0]);
    expect(b.rotation.x).toBe(0);
    expect(b.visible).toBe(true);
    expect(spareCount("pool-reuse")).toBe(0);
  });

  it("keeps a copy given back twice only once", () => {
    const a = prefab("pool-twice", box);
    release(a);
    release(a);
    expect(spareCount("pool-twice")).toBe(1);
  });

  it("only detaches things that never came from the pool", () => {
    const parent = new THREE.Group();
    const loose = box();
    parent.add(loose);
    release(loose);
    expect(loose.parent).toBeNull();
  });
});
