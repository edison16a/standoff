import { describe, expect, it } from "vitest";
import { onField, PIECES, pieceDistance } from "./arena";
import { Battle } from "./battle";
import type { FighterSetup } from "./fighter";
import type { GunId } from "./guns";
import { engageRange, pressureAt, STYLES } from "./tactics";
import { STEP } from "./tuning";
import { dist, turnTo } from "./vec";

/** A player who never touches the phone against a computer player standing still in the middle of the field. */
function duel(gun: GunId): Battle {
  const b = new Battle(
    [
      { team: 0, seat: 1, name: "Me", character: "pro", gun },
      { team: 1, seat: null, name: "Dummy", character: "heavy", gun: "rifle", difficulty: "training" },
    ],
    3,
  );
  while (b.match.phase !== "fight") b.step();
  b.fighters[1]!.pos = { x: 0, z: 6 };
  return b;
}

/** Plays a duel on, sampling the player's distance and bearing from the dummy twice a second. */
function follow(b: Battle, seconds: number) {
  const me = b.fighters[0]!;
  const dummy = b.fighters[1]!;
  const samples: { d: number; want: number; band: number; bearing: number }[] = [];
  const style = STYLES[me.gun.id];
  for (let i = 0; i < seconds / STEP; i++) {
    b.step();
    if (i % 30 !== 0) continue;
    const want = engageRange(style, pressureAt(b.match.roundTime, false), false);
    samples.push({ d: dist(me.pos, dummy.pos), want, band: style.engage[1], bearing: Math.atan2(me.pos.x - dummy.pos.x, me.pos.z - dummy.pos.z) });
  }
  return samples;
}

describe("skirmish movement", { timeout: 120_000 }, () => {
  it.each(["rifle", "smg", "shotgun"] as const)("closes in to the %s's range and holds it there", (gun) => {
    const b = duel(gun);
    follow(b, 12);
    const held = follow(b, 40);
    const inBand = held.filter((s) => Math.abs(s.d - s.want) <= s.band).length / held.length;
    expect(inBand).toBeGreaterThan(0.7);
    // Never charging into the dummy, never hanging back.
    for (const s of held) {
      expect(s.d).toBeGreaterThan(2.5);
      expect(s.d).toBeLessThan(s.want + s.band * 2);
    }
  });

  it("keeps circling round the other team, turning back now and then", () => {
    const b = duel("smg");
    const me = b.fighters[0]!;
    follow(b, 12);
    const held = follow(b, 50);
    let around = 0;
    let unwrapped = 0;
    let lo = 0;
    let hi = 0;
    const ways = new Set<number>();
    for (let i = 1; i < held.length; i++) {
      const step = turnTo(held[i - 1]!.bearing, held[i]!.bearing);
      around += Math.abs(step);
      unwrapped += step;
      lo = Math.min(lo, unwrapped);
      hi = Math.max(hi, unwrapped);
      if (Math.abs(step) > 0.02) ways.add(Math.sign(step));
    }
    expect(me.brain.orbit === 1 || me.brain.orbit === -1).toBe(true);
    // Well over a quarter of the way round in all, across a wide arc, and both ways.
    expect(around).toBeGreaterThan(Math.PI);
    expect(hi - lo).toBeGreaterThan(1.2);
    expect(ways).toEqual(new Set([1, -1]));
  });
});

const BOTS: FighterSetup[] = [
  { team: 0, seat: null, name: "Ada", character: "pro", gun: "rifle", difficulty: "medium" },
  { team: 1, seat: null, name: "Bo", character: "operator", gun: "smg", difficulty: "medium" },
  { team: 0, seat: null, name: "Cy", character: "runner", gun: "shotgun", difficulty: "medium" },
  { team: 1, seat: null, name: "Di", character: "heavy", gun: "sniper", difficulty: "hard" },
];

/** Players who never touch their phones, two a side, against nothing that shoots: the round runs long. */
const PLAYERS: FighterSetup[] = [
  { team: 0, seat: 1, name: "P1", character: "pro", gun: "rifle" },
  { team: 1, seat: 2, name: "P2", character: "operator", gun: "smg" },
  { team: 0, seat: 3, name: "P3", character: "runner", gun: "shotgun" },
  { team: 1, seat: 4, name: "P4", character: "heavy", gun: "sniper" },
];

interface Long {
  stillest: number;
  inside: number;
  offField: number;
  mateGaps: number[];
  fightSeconds: number;
}

/** Steps a battle for `seconds` of fighting, watching every living fighter. */
function longRun(b: Battle, seconds: number): Long {
  const out: Long = { stillest: 0, inside: 0, offField: 0, mateGaps: [], fightSeconds: 0 };
  const still = new Map<number, number>();
  while (out.fightSeconds < seconds && b.match.phase !== "done") {
    b.step();
    if (b.match.phase !== "fight") {
      still.clear();
      continue;
    }
    out.fightSeconds += STEP;
    for (const f of b.fighters.filter((x) => x.alive)) {
      const s = Math.hypot(f.vel.x, f.vel.z) < 0.2 ? (still.get(f.id) ?? 0) + STEP : 0;
      still.set(f.id, s);
      out.stillest = Math.max(out.stillest, s);
      if (PIECES.some((p) => pieceDistance(p, f.pos) < 0.25)) out.inside += 1;
      if (!onField(f.pos)) out.offField += 1;
    }
    // Teammates' spacing, once they are out of their base.
    if (b.match.roundTime > 3) {
      for (const team of [0, 1]) {
        const [a, c] = b.fighters.filter((f) => f.team === team && f.alive);
        if (a && c) out.mateGaps.push(dist(a.pos, c.pos));
      }
    }
  }
  return out;
}

describe("a long skirmish", { timeout: 300_000 }, () => {
  const runs = [longRun(new Battle(BOTS, 21), 240), longRun(new Battle(BOTS, 22), 240), longRun(new Battle(PLAYERS, 23), 120)];

  it("never leaves a fighter standing still for long, stuck on a wall or off the field", () => {
    for (const r of runs) {
      expect(r.fightSeconds).toBeGreaterThan(60);
      expect(r.stillest).toBeLessThan(2.5);
      expect(r.inside).toBe(0);
      expect(r.offField).toBe(0);
    }
  });

  it("keeps teammates apart", () => {
    for (const r of runs) {
      const mean = r.mateGaps.reduce((a, g) => a + g, 0) / r.mateGaps.length;
      const close = r.mateGaps.filter((g) => g < 3).length / r.mateGaps.length;
      expect(mean).toBeGreaterThan(7);
      expect(close).toBeLessThan(0.03);
    }
  });
});
