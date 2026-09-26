import { beforeAll, describe, expect, it } from "vitest";
import { onField, PIECES, pieceDistance } from "./arena";
import { Battle } from "./battle";
import type { BattleEvent } from "./events";
import type { FighterSetup, Pose, Stance } from "./fighter";
import { GUNS } from "./guns";
import { RULES, STEP } from "./tuning";
import { dist } from "./vec";

const BOTS: FighterSetup[] = [
  { team: 0, seat: null, name: "Ada", character: "pro", gun: "rifle" },
  { team: 1, seat: null, name: "Bo", character: "operator", gun: "smg" },
  { team: 0, seat: null, name: "Cy", character: "runner", gun: "shotgun" },
  { team: 1, seat: null, name: "Di", character: "heavy", gun: "sniper" },
];

interface Watch {
  events: BattleEvent[];
  roundLengths: number[];
  maxOpen: number;
  stances: Set<Stance>;
  poses: Set<Pose>;
  mateGap: number[];
  inside: number;
  offField: number;
}

/** Plays a whole bot match, watching every fighter every step. */
function watchMatch(seed: number): { battle: Battle; watch: Watch } {
  const battle = new Battle(BOTS, seed);
  const w: Watch = { events: [], roundLengths: [], maxOpen: 0, stances: new Set(), poses: new Set(), mateGap: [], inside: 0, offField: 0 };
  const open = new Map<number, number>();
  for (let i = 0; i < 60 * 60 * 15 && battle.match.phase !== "done"; i++) {
    for (const e of battle.step()) {
      w.events.push(e);
      if (e.type === "round-end") w.roundLengths.push(battle.match.roundTime);
    }
    if (battle.match.phase !== "fight") continue;
    for (const f of battle.fighters.filter((x) => x.alive)) {
      w.stances.add(f.brain.stance);
      w.poses.add(f.pose);
      if (PIECES.some((p) => pieceDistance(p, f.pos) < 0.25)) w.inside += 1;
      if (!onField(f.pos)) w.offField += 1;
      // Out in the open means more than a stride from any cover spot.
      const covered = battle.graph.spots.some((s) => dist(s.pos, f.pos) < 1.2);
      const o = covered ? 0 : (open.get(f.id) ?? 0) + STEP;
      open.set(f.id, o);
      w.maxOpen = Math.max(w.maxOpen, o);
    }
    const [a, , c] = battle.fighters;
    if (i % 30 === 0 && a!.alive && c!.alive) w.mateGap.push(dist(a!.pos, c!.pos));
  }
  return { battle, watch: w };
}

let run: { battle: Battle; watch: Watch };
beforeAll(() => {
  run = watchMatch(7);
}, 120_000);

describe("a bot match", () => {
  it("plays through to a winner at five rounds", () => {
    const { match } = run.battle;
    expect(match.phase).toBe("done");
    expect(Math.max(...match.score)).toBe(RULES.roundsToWin);
    expect(run.watch.events.filter((e) => e.type === "match-end")).toHaveLength(1);
  });

  it("keeps fights happening: every round ends in a firefight well inside the limit", () => {
    expect(run.watch.roundLengths.length).toBeGreaterThanOrEqual(RULES.roundsToWin);
    for (const t of run.watch.roundLengths) expect(t).toBeLessThan(RULES.roundLimit * 0.6);
    const kills = run.watch.events.filter((e) => e.type === "kill").length;
    expect(kills).toBeGreaterThanOrEqual(RULES.roundsToWin * 2 - 2);
    expect(run.watch.events.some((e) => e.type === "hit" && e.head)).toBe(true);
    expect(run.watch.events.some((e) => e.type === "reload-start")).toBe(true);
  });

  it("never leaves a fighter in the open for long", () => {
    expect(run.watch.maxOpen).toBeLessThan(2.5);
  });

  it("runs, hides, crouches and peeks, and never walks through cover or off the field", () => {
    for (const s of ["move", "hide", "peek"] as const) expect(run.watch.stances.has(s)).toBe(true);
    for (const p of ["run", "crouch", "peek"] as const) expect(run.watch.poses.has(p)).toBe(true);
    expect(run.watch.inside).toBe(0);
    expect(run.watch.offField).toBe(0);
  });

  it("spreads teammates out", () => {
    const gaps = run.watch.mateGap;
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    expect(mean).toBeGreaterThan(5);
  });

  it("puts everyone back at full health and ammo, ends swapped, each round", () => {
    const b = new Battle(BOTS, 3);
    const startZ = b.fighters.map((f) => Math.sign(f.pos.z));
    for (const f of b.fighters.filter((x) => x.team === 1)) f.alive = false;
    b.fighters[0]!.health = 30;
    b.fighters[0]!.gun.ammo = 2;
    let steps = 0;
    while (b.match.round === 1 && steps++ < 60 * 20) b.step();
    expect(b.match.score).toEqual([1, 0]);
    for (const [i, f] of b.fighters.entries()) {
      expect(f.alive).toBe(true);
      expect(f.health).toBe(RULES.health);
      expect(f.gun.ammo).toBe(GUNS[f.gun.id].magazine);
      expect(Math.sign(f.pos.z)).toBe(-startZ[i]!);
    }
  });

  it("plays out the same way from the same seed", () => {
    const a = new Battle(BOTS, 11);
    const b = new Battle(BOTS, 11);
    for (let i = 0; i < 60 * 12; i++) expect(JSON.stringify(a.step())).toBe(JSON.stringify(b.step()));
    expect(a.fighters.map((f) => f.pos)).toEqual(b.fighters.map((f) => f.pos));
  });
});

describe("a human's gun", () => {
  const human = (gun: FighterSetup["gun"]): Battle => {
    const b = new Battle([{ team: 0, seat: 1, name: "Me", character: "pro", gun }, { team: 1, seat: null, name: "Bot", character: "heavy", gun: "rifle" }], 1);
    while (b.match.phase !== "fight") b.step();
    return b;
  };
  const shotsOf = (events: BattleEvent[]) => events.filter((e) => e.type === "shot" && e.shooter === 0).length;

  it("keeps firing an automatic while held, and stops on release", () => {
    const b = human("smg");
    b.setAim(0, 0, 0.5);
    b.setTrigger(0, true);
    let shots = 0;
    for (let i = 0; i < 30; i++) shots += shotsOf(b.step());
    expect(shots).toBeGreaterThanOrEqual(5);
    b.setTrigger(0, false);
    let after = 0;
    for (let i = 0; i < 30; i++) after += shotsOf(b.step());
    expect(after).toBe(0);
  });

  it("fires a tap gun once per press, even when pressed a moment early", () => {
    const b = human("sniper");
    b.setAim(0, 0, 0.5);
    b.setTrigger(0, true);
    let shots = 0;
    for (let i = 0; i < 60; i++) shots += shotsOf(b.step());
    expect(shots).toBe(1);
    b.setTrigger(0, false);
    b.setTrigger(0, true);
    for (let i = 0; i < 60; i++) shots += shotsOf(b.step());
    expect(shots).toBe(2);
  });

  it("reloads on the button, and kicks the aim so the camera can show it", () => {
    const b = human("rifle");
    b.setAim(0, 0, 0.5);
    b.setTrigger(0, true);
    for (let i = 0; i < 20; i++) b.step();
    const gun = b.fighters[0]!.gun;
    expect(gun.kick.pitch).toBeGreaterThan(0.02);
    b.setTrigger(0, false);
    b.reload(0);
    expect(gun.reloading).toBe(true);
    const events: BattleEvent[] = [];
    for (let i = 0; i < 60 * 3; i++) events.push(...b.step());
    expect(events.some((e) => e.type === "reloaded" && e.fighter === 0)).toBe(true);
    expect(gun.kick.pitch).toBeLessThan(0.01);
  });
});

// Whole rounds of fighting take a while on a busy machine, so these get a minute.
describe("a match run by the host", () => {
  it("can be shortened for a quick test match", () => {
    const b = new Battle(BOTS, 5, { roundsToWin: 1 });
    for (let i = 0; i < 60 * 60 * 5 && b.match.phase !== "done"; i++) b.step();
    expect(b.match.phase).toBe("done");
    expect(Math.max(...b.match.score)).toBe(1);
  }, 60_000);

  it("lets the computer shoot for a player whose phone dropped, and hands the gun back", () => {
    const setups: FighterSetup[] = [
      { team: 0, seat: 1, name: "Me", character: "pro", gun: "smg" },
      { team: 1, seat: null, name: "Bot", character: "heavy", gun: "rifle" },
    ];
    const b = new Battle(setups, 2);
    b.setAutopilot(0, true);
    // A computer never needs the button: shots come while the phone is away.
    let shots = 0;
    for (let i = 0; i < 60 * 60 && shots === 0; i++) shots += b.step().filter((e) => e.type === "shot" && e.shooter === 0).length;
    expect(shots).toBeGreaterThan(0);
    b.setAutopilot(0, false);
    const me = b.fighters[0]!;
    expect(me.trigger.held).toBe(false);
    // Back on the phone, nothing fires without the button.
    let after = 0;
    for (let i = 0; i < 60 * 3; i++) after += b.step().filter((e) => e.type === "shot" && e.shooter === 0).length;
    expect(after).toBe(0);
    // A computer player can never be put on autopilot, or taken off it.
    b.setAutopilot(1, false);
    let botShots = 0;
    for (let i = 0; i < 60 * 60 && botShots === 0 && b.match.phase !== "done"; i++) botShots += b.step().filter((e) => e.type === "shot" && e.shooter === 1).length;
    expect(botShots).toBeGreaterThan(0);
  }, 60_000);
});
