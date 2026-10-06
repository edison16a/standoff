import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { LADDER } from "../quality/ladder";
import { Floodlights } from "./floodlights";

const shadowed = (lights: Floodlights) =>
  lights.group.children.filter((o): o is THREE.DirectionalLight => o instanceof THREE.DirectionalLight && o.castShadow);

describe("the floodlights", () => {
  it("redraw every shadow map they throw away, even the one that stopped updating", () => {
    const lights = new Floodlights(true);
    for (const rung of LADDER) lights.setTier(rung.tier);
    const all = shadowed(lights);
    expect(all).toHaveLength(2);
    // A light whose map is gone and never redrawn leaves three binding a bad texture, so nothing lit draws.
    for (const light of all) expect(light.shadow.autoUpdate || light.shadow.needsUpdate).toBe(true);
    lights.dispose();
  });
});
