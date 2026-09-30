import { describe, expect, it } from "vitest";
import { STEP } from "../engine/tuning";
import { KEY_ART_AT, KEY_ART_ROLES, KeyArt } from "./key-art";

/** Runs the stage up to the still and returns every event on the way. */
function runToStill(stage: KeyArt) {
  const events = [];
  for (let t = 0; t < KEY_ART_AT; t += STEP) events.push(...stage.step());
  return events;
}

describe("the key art stage", () => {
  it("holds the hero still and quiet, facing the lens", () => {
    const stage = new KeyArt();
    const hero = stage.battle.fighters[0]!;
    const start = { ...hero.pos };
    const events = runToStill(stage);
    expect(events.some((e) => e.type === "shot" && e.shooter === 0)).toBe(false);
    expect(hero.pos).toEqual(start);
    expect(hero.alive).toBe(true);
  });

  it("fills the air with paint from both sides", () => {
    const events = runToStill(new KeyArt());
    const shooters = new Set(events.flatMap((e) => (e.type === "shot" ? [e.shooter] : [])));
    const teams = new Set([...shooters].map((id) => KEY_ART_ROLES[id]!.team));
    expect(teams).toEqual(new Set([0, 1]));
  });

  it("takes out only the scripted fighter, at its mark", () => {
    const stage = new KeyArt();
    const events = runToStill(stage);
    const kills = events.filter((e) => e.type === "kill");
    const scripted = KEY_ART_ROLES.flatMap((r, i) => (r.down ? [i] : []));
    expect(kills.map((e) => (e.type === "kill" ? e.victim : -1))).toEqual(scripted);
    stage.battle.fighters.forEach((f, i) => expect(f.alive).toBe(!scripted.includes(i)));
  });
});
