import { describe, expect, it } from "vitest";
import type { SurvivalGame } from "../engine/game";
import { makeZombie, type Zombie } from "../engine/zombie";
import { BOSS_KINDS, KINDS, type BossKind } from "../engine/zombie-kinds";
import { jointShare, lookHeight } from "./camera-rig";

const EYE = 1.65;
/** Half the fight camera's view, up and down, in radians. */
const HALF_VIEW = (28 * Math.PI) / 180;

function bossAt(kind: BossKind, ahead: number, attacking: boolean): Zombie {
  const z = makeZombie(1, kind, ahead, 0, 0, { hpScale: 1, speedScale: 1, harm: 1, weakHp: 5, seed: 0.5 });
  if (attacking) z.state = "attack";
  return z;
}

const fight = (z: Zombie) => ({ encounter: { zombies: [z] } }) as unknown as SurvivalGame;

/** How far above the middle of the view each glowing joint sits, in radians. */
function offsets(z: Zombie): number[] {
  const spec = KINDS[z.kind];
  const look = Math.atan2(lookHeight(fight(z)) - EYE, 14);
  return spec.weakPoints
    .filter((_, i) => (z.weak[i] ?? 0) > 0)
    .map((j) => Math.atan2(jointShare(j, z.state === "attack") * spec.height - EYE, z.ahead) - look);
}

describe("the fight camera", () => {
  it("keeps every glowing joint of a boss in view once it is close enough to swing", () => {
    for (const kind of BOSS_KINDS) {
      for (const attacking of [false, true]) {
        for (const off of offsets(bossAt(kind, KINDS[kind].reach, attacking))) {
          expect(Math.abs(off), `${kind} ${attacking ? "swinging" : "walking"}`).toBeLessThan(HALF_VIEW * 0.9);
        }
      }
    }
  });

  it("looks down at the knees once the joints up top are broken", () => {
    const z = bossAt("tank", KINDS.tank.reach, true);
    const all = lookHeight(fight(z));
    z.weak = z.weak.map((hp, i) => (KINDS.tank.weakPoints[i]!.startsWith("knee") ? hp : 0));
    expect(lookHeight(fight(z))).toBeLessThan(all);
    for (const off of offsets(z)) expect(Math.abs(off)).toBeLessThan(0.05);
  });

  it("looks just under eye level with no boss near", () => {
    const far = bossAt("behemoth", 25, false);
    expect(lookHeight(fight(far))).toBeCloseTo(1.45, 6);
  });
});
