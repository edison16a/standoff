import { describe, expect, it } from "vitest";
import { newDrive } from "../downs";
import { FIELD, YARD } from "../field";
import { Match } from "../match";
import { startChoose } from "../phases";
import { Rng } from "../rng";
import { ROUTE_EDGE } from "../route-bounds";
import { BOTS, PEOPLE, bySeat, peopleMatch, run } from "../test-helpers";
import { STEP } from "../tuning";
import { CARD, clipToCard, pageCards } from "./card";
import { DEAL, dealPlays, playKey, type RunnerKind } from "./deal";
import { HUDDLE } from "./huddle";
import { layLegs } from "./lay";
import { DEEP, PLAY_ROUTES, playRoutePoints, type PlayRoute } from "./shapes";
import { playbookView, routeArrow } from "./view";

const CLEAR_OUT_SET: ReadonlySet<PlayRoute> = new Set(["go", "fade", "post", "slant", "out", "curl"]);

const PASS_KINDS: RunnerKind[] = ["wide", "wing", "deep", "wide"];
const RUN_KINDS: RunnerKind[] = ["wide", "wing", "deep", "back"];

/** Two runners on the Storm, one of them the computer's, as the lobby always fills a side. */
const FULL = [...PEOPLE.slice(0, 2), { team: 0, role: "runner", build: "routerunner", seat: null } as const, ...PEOPLE.slice(2)];

describe("the playbook's deal", () => {
  it("deals two different pass plays, each with one or two deep routes and every route different", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const plays = dealPlays(new Rng(seed), "throw", PASS_KINDS);
      expect(plays).toHaveLength(DEAL.size);
      expect(new Set(plays.map(playKey)).size).toBe(DEAL.size);
      expect(new Set(plays.map((p) => p.name)).size).toBe(DEAL.size);
      for (const p of plays) {
        expect(p.routes).toHaveLength(4);
        expect(new Set(p.routes).size).toBe(4);
        const deep = p.routes.filter((r) => DEEP.has(r)).length;
        expect(deep).toBeGreaterThanOrEqual(1);
        expect(deep).toBeLessThanOrEqual(2);
        // The deep threat always goes long; a wing never runs a route meant for the outside.
        expect(DEEP.has(p.routes[2]!)).toBe(true);
        expect(["go", "fade", "post", "corner", "comeback", "dig", "slant"]).not.toContain(p.routes[1]);
      }
    }
  });

  it("deals run plays with a carry for the back, clear outs wide and blocks for the rest", () => {
    const plays = dealPlays(new Rng(4), "run", RUN_KINDS);
    expect(plays).toHaveLength(DEAL.size);
    for (const p of plays) {
      expect(p.carry).not.toBeNull();
      expect(p.routes[1]).toBe("block");
      expect(p.routes[2]).toBe("block");
      expect(p.routes[3]).toBe("block");
      expect(CLEAR_OUT_SET.has(p.routes[0]!)).toBe(true);
    }
  });

  it("deals a fresh page with none of the plays on the old one", () => {
    const rng = new Rng(9);
    const first = dealPlays(rng, "throw", PASS_KINDS);
    const next = dealPlays(rng, "throw", PASS_KINDS, new Set(first.map(playKey)));
    for (const p of next) expect(first.map(playKey)).not.toContain(playKey(p));
  });
});

describe("the play call", () => {
  it("gives a person's QB a page of plays after Throw, and runs the one he picks", () => {
    const m = peopleMatch();
    const qb = bySeat(m, 0);
    m.choose(qb.id, "throw");
    expect(m.phase).toBe("choose");
    expect(m.huddle?.plays).toHaveLength(DEAL.size);
    expect(m.huddle?.runners).toHaveLength(4);
    const pick = m.huddle!.plays[1]!;
    m.playbook(qb.id, 1);
    expect(m.phase).toBe("presnap");
    expect(m.play?.design).toEqual(pick);
    // Every computer runner on the card has the route the card drew.
    for (const id of m.play!.runners) expect(m.athletes[id]!.bot.route.length).toBeGreaterThan(0);
  });

  it("deals a new page on Refresh, and goes back to the call with a fresh clock", () => {
    const m = new Match({ entries: FULL, seed: 7, firstOffense: 0 });
    const qb = bySeat(m, 0);
    m.choose(qb.id, "run");
    const before = m.huddle!.plays.map(playKey);
    m.playbook(qb.id, "redeal");
    expect(m.huddle!.call).toBe("run");
    for (const p of m.huddle!.plays) expect(before).not.toContain(playKey(p));
    run(m, 3);
    m.playbook(qb.id, "back");
    expect(m.huddle).toBeNull();
    expect(m.phaseT).toBeLessThan(0.1);
  });

  it("calls the first play on the page when the clock runs out", () => {
    const m = peopleMatch();
    const qb = bySeat(m, 0);
    m.choose(qb.id, "throw");
    const first = m.huddle!.plays[0]!;
    run(m, HUDDLE.seconds + 0.2, (mm) => mm.phase === "presnap");
    expect(m.phase).toBe("presnap");
    expect(m.play?.design).toEqual(first);
  });

  it("lets a computer QB pick his own play, and keeps the filmed game with no playbook", () => {
    const bots = new Match({ entries: BOTS, seed: 3, firstOffense: 0 });
    run(bots, 6, (mm) => mm.phase === "presnap" || mm.phase === "kick");
    if (bots.phase === "presnap") expect(bots.play?.design).not.toBeNull();
    expect(bots.huddle).toBeNull();
    const filmed = new Match({ entries: PEOPLE, seed: 3, firstOffense: 0, filmed: true });
    filmed.choose(bySeat(filmed, 0).id, "throw");
    expect(filmed.huddle).toBeNull();
    expect(filmed.play?.design).toBeNull();
  });

  it("runs only the computer runners on the card: a person's runner goes where he steers", () => {
    const m = new Match({ entries: FULL, seed: 5, firstOffense: 0 });
    const qb = bySeat(m, 0);
    const person = bySeat(m, 1);
    m.choose(qb.id, "throw");
    m.playbook(qb.id, 0);
    m.press(qb.id, "hike");
    const bot = m.athletes.find((a) => a.team === 0 && a.role === "runner" && a.auto)!;
    const [px, bx] = [person.x, bot.x];
    for (let t = 0; t < 1.5; t += STEP) m.step(STEP);
    expect(Math.hypot(person.x - px, 0)).toBeLessThan(0.3);
    expect(Math.abs(bot.x - bx)).toBeGreaterThan(3);
  });
});

describe("routes on the card and the field", () => {
  it("keeps every route inside the field and every card line inside its card, wherever the ball is", () => {
    for (const [yard, ballZ] of [[25, 0], [50, -FIELD.hashZ], [80, FIELD.hashZ], [95, FIELD.hashZ], [5, -FIELD.hashZ]] as const) {
      for (const team of [0, 1] as const) {
        const m = peopleMatch({ firstOffense: team });
        m.drive = { ...newDrive(team, yard), ballZ };
        startChoose(m);
        for (const call of ["throw", "run"] as const) {
          m.choose(m.qbOf(team).id, call);
          const { cards } = pageCards(m, m.huddle!);
          for (const card of cards) {
            for (const r of card.runners) for (const [u, v] of r.path) expect(u >= 0 && u <= 1 && v >= 0 && v <= 1).toBe(true);
          }
          m.playbook(m.qbOf(team).id, 0);
          for (const id of m.play!.runners) {
            for (const p of m.athletes[id]!.bot.route) {
              expect(Math.abs(p.z)).toBeLessThanOrEqual(ROUTE_EDGE.side + 1e-6);
              expect(Math.abs(p.x)).toBeLessThanOrEqual(ROUTE_EDGE.end + 1e-6);
            }
          }
          startChoose(m);
        }
      }
    }
  });

  it("draws every route in straight legs: up, across or at forty five degrees", () => {
    const start = { x: 0, z: 0 };
    for (const kind of PLAY_ROUTES) {
      const pts = [start, ...playRoutePoints(kind, start, 1, 1)];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1]!;
        const b = pts[i]!;
        const angle = (Math.atan2(Math.abs(b.z - a.z), Math.abs(b.x - a.x)) * 180) / Math.PI;
        expect([0, 45, 90].some((k) => Math.abs(angle - k) < 0.5)).toBe(true);
      }
    }
  });

  it("cuts a leg where it meets the sideline and carries on along it, keeping its corners sharp", () => {
    const side = ROUTE_EDGE.side;
    const pts = layLegs({ x: 0, z: side - 3 }, [{ x: 10, z: side - 3 }, { x: 30, z: side + 17 }]);
    expect(pts[1]).toEqual({ x: 13, z: side });
    expect(pts[2]).toEqual({ x: 30, z: side });
    expect(routeArrow({ x: 0, z: 0 }, [{ x: 10, z: 0 }, { x: 30, z: 20 }], 20, 1)).toEqual([{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 20, z: 10 }]);
  });

  it("cuts a line where it leaves the card, so its arrow sits on the edge", () => {
    const { path, cut } = clipToCard([[0.5, 0.2], [0.5, 0.8], [0.6, 1.6]]);
    expect(cut).toBe(true);
    expect(path[path.length - 1]).toEqual([0.525, 1]);
    expect(clipToCard([[0.1, 0.1], [0.2, 0.3]]).cut).toBe(false);
  });
});

describe("the play marks on the big screen", () => {
  it("rings the four while the QB picks, draws each whole route lined up, and fades once the ball is gone", () => {
    const m = new Match({ entries: FULL, seed: 8, firstOffense: 0 });
    const qb = bySeat(m, 0);
    m.choose(qb.id, "throw");
    expect(playbookView(m)).toMatchObject({ stage: "picking" });
    expect(playbookView(m)!.runners.map((r) => r.n)).toEqual([1, 2, 3, 4]);
    m.playbook(qb.id, 0);
    const set = playbookView(m)!;
    expect(set.stage).toBe("set");
    const top = (m.drive.los + CARD.ahead - 50) * YARD * m.sign;
    for (const r of set.runners) {
      const arrow = r.arrow!;
      const route = m.athletes[r.id]!.bot.route;
      // Every cut of the route is on the turf, not just its first leg, up to the card's top edge.
      const shown = route.filter((p) => (p.x - top) * m.sign <= 0);
      for (const p of shown) expect(arrow.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 1e-6)).toBe(true);
      for (const p of arrow) expect((p.x - top) * m.sign).toBeLessThanOrEqual(1e-6);
    }
    m.press(qb.id, "hike");
    run(m, 1, () => m.carrier() === qb);
    expect(playbookView(m)?.stage).toBe("live");
    m.press(qb.id, "run");
    expect(playbookView(m)).toBeNull();
    // A computer QB's play is not marked.
    const bots = new Match({ entries: BOTS, seed: 8, firstOffense: 0 });
    run(bots, 5, (mm) => mm.phase === "presnap");
    expect(playbookView(bots)).toBeNull();
  });
});
