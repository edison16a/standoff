import { it } from "vitest";
import { createMatch, stepMatch } from "../match";
import type { MatchEvent } from "../events";

it("sim", () => {
  for (const level of ["easy", "hard"] as const) for (const seed of [1, 2, 3]) {
    const s = createMatch([], { seed, level, replays: false });
    const ev: MatchEvent[] = [];
    let plays = 0;
    for (let i = 0; i < 60 * 60 * 40 && s.phase !== "final"; i++) {
      stepMatch(s);
      ev.push(...s.events);
      for (const e of s.events) if (e.type === "hike") plays++;
    }
    const c = (t: string) => ev.filter((e) => e.type === t).length;
    const ends: Record<string, number> = {};
    for (const e of ev) if (e.type === "playEnd") ends[e.end] = (ends[e.end] ?? 0) + 1;
    const tk: Record<string, number> = {};
    for (const e of ev) if (e.type === "tackle") tk[e.result] = (tk[e.result] ?? 0) + 1;
    const kicks = ev.filter((e) => e.type === "kickResult").map((e) => (e.type === "kickResult" ? `${e.kind}:${e.good}:${e.distance}` : ""));
    const gains = ev.filter((e) => e.type === "playEnd").map((e) => (e.type === "playEnd" ? e.gain : 0));
    console.log(level, seed, s.phase, "t", Math.round(s.time), "Q", s.quarter, "score", s.score, "plays", plays, "throws", c("throw"), "catch", c("catch"), "int", c("interception"), "inc", c("incomplete"), "tip", c("tipped"), "sacks", c("sack"), "jukes", c("juke"), "dives", c("dive"), "fd", c("firstDown"), "TO", c("turnover"), JSON.stringify(ends), JSON.stringify(tk), kicks.join(","), "gains", gains.join(" "));
  }
}, 120000);
