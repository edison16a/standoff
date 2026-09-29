import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { AimCaster } from "../aim-caster";
import { CrosshairLayer } from "./crosshair-layer";

function camera(): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(56, 16 / 9, 0.05, 400);
  cam.position.set(3, 1.6, -2);
  cam.rotation.set(0.1, 0.7, 0);
  cam.updateMatrixWorld();
  return cam;
}

/** Where the first crosshair sits, as a direction from the eye in the world. */
function crosshairDirection(layer: CrosshairLayer, cam: THREE.PerspectiveCamera): THREE.Vector3 {
  const mark = layer.group.children[0]!;
  const reticle = mark.children[0]!;
  layer.group.updateMatrixWorld(true);
  return reticle.getWorldPosition(new THREE.Vector3()).sub(cam.position).normalize();
}

describe("a crosshair", () => {
  it("sits exactly where the kicked shot's raycast goes", () => {
    const cam = camera();
    const layer = new CrosshairLayer(cam);
    const point = { x: 0.4, y: -0.3 };
    const kick = { x: 0.012, y: 0.05 };
    layer.update([{ seat: 1, weapon: "ak47", point, kick }], 1 / 60, true);
    const shot = new AimCaster(cam).cast(point, kick, [], () => undefined);
    const ray = shot.point.clone().sub(cam.position).normalize();
    expect(crosshairDirection(layer, cam).angleTo(ray)).toBeLessThan(1e-4);
  });

  it("shows the mark of the aim only while a kick carries the gun off it", () => {
    const cam = camera();
    const layer = new CrosshairLayer(cam);
    const sight = { seat: 1, weapon: "rifle" as const, point: { x: 0, y: 0 } };
    layer.update([{ ...sight, kick: { x: 0, y: 0 } }], 1 / 60, true);
    const anchor = () => layer.group.children[0]!.children[1]!;
    expect(anchor().visible).toBe(false);
    layer.update([{ ...sight, kick: { x: 0, y: 0.03 } }], 1 / 60, true);
    expect(anchor().visible).toBe(true);
  });

  it("builds a new crosshair when a player swaps guns, and drops those who left", () => {
    const cam = camera();
    const layer = new CrosshairLayer(cam);
    const point = { x: 0, y: 0 };
    layer.update([{ seat: 1, weapon: "shotgun", point, kick: { x: 0, y: 0 } }, { seat: 2, weapon: "smg", point, kick: { x: 0, y: 0 } }], 1 / 60, true);
    expect(layer.group.children).toHaveLength(2);
    layer.update([{ seat: 1, weapon: "rifle", point, kick: { x: 0, y: 0 } }], 1 / 60, true);
    expect(layer.group.children).toHaveLength(1);
    layer.dispose();
    expect(cam.children).not.toContain(layer.group);
  });
});
