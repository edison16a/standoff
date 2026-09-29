import { describe, expect, it } from "vitest";
import { orbitPose } from "@/games/kit/victory";
import { LINE_HALF_LENGTH } from "@/games/blade-clash/engine/rules";
import { SLOTS } from "@/games/blade-clash/players";
import { SHOT, stageCeremony, yawToward, type Placement } from "./staging";

/** Where a placed model's +x points, on the floor. */
const forward = (p: Placement) => ({ x: Math.cos(p.yaw), z: -Math.sin(p.yaw) });
const unit = (x: number, z: number) => {
  const length = Math.hypot(x, z);
  return { x: x / length, z: z / length };
};

describe("the ceremony's staging", () => {
  it("turns a model toward any direction", () => {
    for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0.6, -0.8]] as const) {
      const f = forward({ x: 0, z: 0, yaw: yawToward(dx, dz) });
      expect(f.x).toBeCloseTo(dx);
      expect(f.z).toBeCloseTo(dz);
    }
  });

  for (const winner of SLOTS) {
    const staging = stageCeremony(winner);
    const shot = { ...SHOT, centre: { x: 0, y: 0, z: 0 }, startAngle: staging.startAngle };

    it(`kneels the loser on their own side facing the champion, when player ${winner} wins`, () => {
      const { loser, winner: champ } = staging;
      expect(Math.sign(loser.x)).toBe(winner === 1 ? 1 : -1);
      expect(Math.abs(loser.x)).toBeLessThan(LINE_HALF_LENGTH);
      const f = forward(loser);
      const to = unit(champ.x - loser.x, champ.z - loser.z);
      expect(f.x * to.x + f.z * to.z).toBeCloseTo(1);
    });

    it(`opens on the champion's front, when player ${winner} wins`, () => {
      const camera = orbitPose(shot, 60).position;
      const to = unit(camera.x, camera.z);
      const f = forward(staging.winner);
      expect(f.x * to.x + f.z * to.z).toBeGreaterThan(0.9);
    });

    it(`never hides the loser behind the champion as the camera swings, when player ${winner} wins`, () => {
      const { loser } = staging;
      for (let t = 0; t < 90; t += 0.5) {
        const { position: c } = orbitPose(shot, t);
        const toChamp = unit(-c.x, -c.z);
        const toLoser = unit(loser.x - c.x, loser.z - c.z);
        const apart = Math.acos(Math.min(1, toChamp.x * toLoser.x + toChamp.z * toLoser.z));
        expect(apart).toBeGreaterThan(0.06);
      }
    });
  }
});
