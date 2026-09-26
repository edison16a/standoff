import { describe, expect, it } from "vitest";
import type { Run } from "../engine/run";
import { JETPACK_HEIGHT } from "../engine/powers";
import { LANES, laneX, RUNNER, SPEED, TRAIN } from "../engine/tuning";
import { ChaseCamera } from "./chase-camera";
import { blocksView, GANTRY, headAbove, TUNNEL_TOP, tunnelCeilingAt, VAULT_SPRING, WIRES, type Overhang } from "./models/overhead";
import { vaultGeometry } from "./models/tunnel";

/** Just enough of a run for the camera: a runner at a height, grounded or flying. */
function runAt(y: number, options: { flying?: boolean; lane?: number } = {}): Run {
  const x = laneX(options.lane ?? 0);
  return {
    runner: { x, y, distance: 100, grounded: !options.flying },
    powers: { has: (kind: string) => kind === "jetpack" && !!options.flying },
    crashed: null,
    speed: SPEED.start,
  } as unknown as Run;
}

/** Where the chase camera settles for a runner held at a height. */
function settle(run: Run, ceiling?: (distance: number, x: number) => number): ChaseCamera {
  const chase = new ChaseCamera();
  if (ceiling) chase.ceiling = ceiling;
  chase.reset(run);
  for (let i = 0; i < 240; i++) chase.update(run, 1 / 60, i / 60);
  return chase;
}

describe("the tunnel vault", () => {
  it("arches up from the walls to the crown, never down over the trains", () => {
    const box = vaultGeometry();
    box.computeBoundingBox();
    expect(box.boundingBox!.min.y).toBeCloseTo(VAULT_SPRING, 3);
    expect(box.boundingBox!.max.y).toBeCloseTo(TUNNEL_TOP, 3);
  });

  it("leaves room over every track for a jetpack flight and the camera on a roof", () => {
    for (const lane of LANES) {
      const x = laneX(lane);
      expect(tunnelCeilingAt(x)).toBeGreaterThan(JETPACK_HEIGHT + RUNNER.height);
      const roof = settle(runAt(TRAIN.height, { lane })).camera.position.y;
      expect(tunnelCeilingAt(x * 0.85)).toBeGreaterThan(roof + 1);
    }
  });

  it("keeps the camera inside when a jetpack flies through", () => {
    const ceiling = (_: number, x: number) => tunnelCeilingAt(x);
    for (const lane of LANES) {
      const eye = settle(runAt(JETPACK_HEIGHT, { flying: true, lane }), ceiling).camera.position;
      expect(eye.y).toBeLessThan(tunnelCeilingAt(eye.x) - 0.3);
      expect(eye.y).toBeGreaterThan(JETPACK_HEIGHT);
    }
  });

  it("leaves the camera alone out in the open", () => {
    const open = settle(runAt(JETPACK_HEIGHT, { flying: true })).camera.position.y;
    const roofed = settle(runAt(JETPACK_HEIGHT, { flying: true }), () => Infinity).camera.position.y;
    expect(roofed).toBeCloseTo(open, 5);
  });
});

describe("gantries and wires between the camera and the runner", () => {
  const view = (y: number) => {
    const eye = settle(runAt(y)).camera.position;
    return { eye: { y: eye.y, z: eye.z }, head: { y: headAbove(y), z: -100 } };
  };
  const gantryAt = (z: number): Overhang => ({ near: z + GANTRY.depth / 2, far: z - GANTRY.depth / 2, ...GANTRY });
  const wiresFrom = (z: number): Overhang => ({ near: z, far: z - 30, ...WIRES });

  it("never get in the way of a runner on the ground", () => {
    const { eye, head } = view(0);
    for (let z = -140; z <= eye.z + 3; z += 0.25) {
      expect(blocksView(gantryAt(z), eye, head)).toBe(false);
      expect(blocksView(wiresFrom(z), eye, head)).toBe(false);
    }
  });

  it("are in the way from a train roof once they reach the runner, so they fade", () => {
    const { eye, head } = view(TRAIN.height);
    expect(blocksView(gantryAt(head.z + 1), eye, head)).toBe(true);
    expect(blocksView(gantryAt(eye.z), eye, head)).toBe(true);
    expect(blocksView(wiresFrom(head.z + 10), eye, head)).toBe(true);
  });

  it("stay as they are far ahead, where they are only lines across the distance", () => {
    const { eye, head } = view(TRAIN.height);
    expect(blocksView(gantryAt(head.z - 20), eye, head)).toBe(false);
    expect(blocksView(wiresFrom(head.z - 20), eye, head)).toBe(false);
  });
});
