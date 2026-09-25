import { describe, expect, it } from "vitest";
import { MOVE_KEYS, moveOf } from "../../engine/moves";
import { CHARACTER_IDS } from "../../roster";
import { CHANNELS, restPose } from "./pose";
import { strikePose, timing } from "./strike";
import { STYLES } from "./styles";

const turn = (a: number) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));

describe("move animations", () => {
  it("every fighter has an animation for every move", () => {
    for (const c of CHARACTER_IDS) for (const key of MOVE_KEYS) expect(STYLES[c].moves[key], `${c} ${key}`).toBeDefined();
  });

  it("finds when a move is live from its hitboxes and projectiles", () => {
    const jab = timing(moveOf("karate", "jab"));
    expect(jab).toEqual({ from: 3, to: 5, hits: [3] });
    const bolt = timing(moveOf("mage", "heavy"));
    expect(bolt.from).toBe(10);
    const rush = timing(moveOf("karate", "ult"));
    expect(rush.hits.length).toBe(6);
  });

  it("strikes differently from the base pose while live and settles back by the end", () => {
    const base = restPose();
    for (const c of CHARACTER_IDS) {
      for (const key of MOVE_KEYS) {
        const move = moveOf(c, key);
        const anim = STYLES[c].moves[key];
        const t = timing(move);
        const live = strikePose(anim, move, t.from + 1, base);
        const moved = CHANNELS.some((ch) => Math.abs(live[ch] - base[ch]) > 0.05);
        expect(moved, `${c} ${key} moves`).toBe(true);
        const end = strikePose(anim, move, move.frames, base);
        for (const ch of CHANNELS) {
          const off = ch === "flip" || ch === "spin" ? turn(end[ch]) : Math.abs(end[ch] - base[ch]);
          expect(off, `${c} ${key} ${ch}`).toBeLessThan(1e-6);
        }
      }
    }
  });
});
