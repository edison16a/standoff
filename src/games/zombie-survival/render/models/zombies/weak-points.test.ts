import * as THREE from "three";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { WEAK_SHARE } from "../../../engine/sim-aim";
import { BOSS_KINDS, KINDS } from "../../../engine/zombie-kinds";
import { buildBoss } from "./bosses";

// The models draw a few canvas textures. A blank canvas stands in, since only the hit shapes matter here.
const blank: unknown = new Proxy(() => blank, { get: () => blank, apply: () => blank });

beforeAll(() => {
  vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => blank }) });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("a boss's glowing joints", () => {
  it("are as big to shoot as the ones the balance bots aim at", () => {
    for (const kind of BOSS_KINDS) {
      const { rig } = buildBoss(kind, 0.5);
      rig.root.updateMatrixWorld(true);
      const weak = rig.proxies.filter((p) => p.userData.part === "weak");
      expect(weak.length, kind).toBe(KINDS[kind].weakPoints.length);
      for (const proxy of weak) {
        const side = (proxy.geometry as THREE.BoxGeometry).parameters.width * proxy.getWorldScale(new THREE.Vector3()).x;
        const shown = side * side;
        const aimed = Math.PI * (WEAK_SHARE * KINDS[kind].height) ** 2;
        // Tuning on the bots only holds if a real player has about as much to hit.
        expect(shown / aimed, kind).toBeGreaterThan(0.75);
        expect(shown / aimed, kind).toBeLessThan(1.35);
      }
    }
  });
});
