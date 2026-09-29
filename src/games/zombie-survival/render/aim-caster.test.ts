import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { makeZombie } from "../engine/zombie";
import { AimCaster } from "./aim-caster";

/** A riot zombie's vest straight ahead of the camera. */
function scene() {
  const camera = new THREE.PerspectiveCamera(56, 16 / 9, 0.05, 400);
  camera.updateMatrixWorld();
  const vest = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.3));
  vest.position.set(0, 0, -6);
  vest.userData = { zombie: 1, part: "body", weak: null };
  vest.updateMatrixWorld();
  const riot = makeZombie(1, "armored", 6, 0, 0, { hpScale: 1, speedScale: 1, harm: 1, weakHp: 0, seed: 0.5 });
  return { caster: new AimCaster(camera), vest, riot };
}

describe("a shot's impact", () => {
  it("sparks off a riot vest, unless the round goes through it", () => {
    const { caster, vest, riot } = scene();
    const find = () => riot;
    expect(caster.cast({ x: 0, y: 0 }, { x: 0, y: 0 }, [vest], find).impact).toBe("armor");
    expect(caster.cast({ x: 0, y: 0 }, { x: 0, y: 0 }, [vest], find, true).impact).toBe("flesh");
  });
});
