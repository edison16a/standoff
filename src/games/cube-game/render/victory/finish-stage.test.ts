import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { orbitPose, type OrbitShot } from "@/games/kit/victory";
import { finishShift, finishShot, HALF, hop, PEDESTAL, PODIUM, standFor, type Stand } from "./finish-stage";

/**
 * The highest a hopping cube reaches on screen over a long look, as a
 * device coordinate: 1 is the top edge, 0 the middle. Seen through the
 * victory room's lens on a 16:9 screen, after the opening.
 */
function highestHop(stand: Stand, rest: number, xs: number[]): number {
  const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 120);
  camera.setViewOffset(1, 1, -finishShift(stand), 0, 1, 1);
  const shot = { ...finishShot(stand) } as OrbitShot;
  let highest = -1;
  for (let t = shot.introS; t < 60; t += 0.05) {
    const { position: p, target: at } = orbitPose(shot, t);
    camera.position.set(p.x, p.y, p.z);
    camera.lookAt(at.x, at.y, at.z);
    camera.updateMatrixWorld();
    xs.forEach((x, i) => {
      const { lift, angle } = hop(t + i * 0.8);
      // A cube turning in the air reaches higher with its corner.
      const top = rest + HALF + lift + HALF * (Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle)));
      for (const z of [-HALF, HALF]) highest = Math.max(highest, new THREE.Vector3(x, top, z).project(camera).y);
    });
  }
  return highest;
}

/** The names and their subtitle fill about the top 38% of the screen. */
const UNDER_THE_NAMES = 0.2;

describe("the finish celebration", () => {
  it("stands a player alone on a pedestal with a cup once they finish", () => {
    expect(standFor([{ slot: 1, place: 1, finished: true }])).toEqual({ kind: "pedestal", slots: [1], cup: true });
  });

  it("puts a race's winner on the top step with gold and the other second with silver", () => {
    const stand = standFor([
      { slot: 1, place: 2, finished: false },
      { slot: 2, place: 1, finished: true },
    ]);
    expect(stand).toEqual({
      kind: "podium",
      places: [
        { slot: 2, place: 1, cup: "gold" },
        { slot: 1, place: 2, cup: "silver" },
      ],
    });
  });

  it("gives no cups to a race nobody finished, ordered by how far each got", () => {
    const stand = standFor([
      { slot: 1, place: 1, finished: false },
      { slot: 2, place: 2, finished: false },
    ]);
    expect(stand.kind).toBe("podium");
    if (stand.kind === "podium") expect(stand.places.map((p) => [p.slot, p.cup])).toEqual([[1, null], [2, null]]);
  });

  it("shares one pedestal on a dead heat", () => {
    expect(standFor([
      { slot: 1, place: 1, finished: true },
      { slot: 2, place: 1, finished: true },
    ])).toEqual({ kind: "pedestal", slots: [1, 2], cup: true });
  });

  it("hops up and back down, landing flat after half a turn", () => {
    expect(hop(0).lift).toBe(0);
    const peak = hop(0.275);
    expect(peak.lift).toBeCloseTo(0.75);
    const landed = hop(1);
    expect(landed.lift).toBe(0);
    expect(landed.angle).toBeCloseTo(-Math.PI);
    // Every landing is a whole number of half turns, so a face is always down.
    for (let t = 0; t < 12; t += 0.37) {
      const { lift, angle } = hop(t);
      if (lift === 0) expect(Math.abs(angle / Math.PI - Math.round(angle / Math.PI))).toBeLessThan(1e-9);
    }
  });

  it("keeps the top of every hop under the names all through the shot", () => {
    const race = standFor([
      { slot: 1, place: 2, finished: false },
      { slot: 2, place: 1, finished: true },
    ]);
    expect(highestHop(race, PODIUM.height, [0])).toBeLessThan(UNDER_THE_NAMES);
    expect(highestHop(standFor([{ slot: 1, place: 1, finished: true }]), PEDESTAL.height, [0])).toBeLessThan(UNDER_THE_NAMES);
    const tie = standFor([
      { slot: 1, place: 1, finished: true },
      { slot: 2, place: 1, finished: true },
    ]);
    expect(highestHop(tie, PEDESTAL.height, [-0.62, 0.62])).toBeLessThan(UNDER_THE_NAMES);
  });
});
