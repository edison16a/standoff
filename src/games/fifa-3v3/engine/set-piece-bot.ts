import { other } from "../teams";
import { botSkill } from "./bot-level";
import { goalX } from "./goal";
import { crossing, onGoal } from "./keeper-judge";
import { freeKickLaunch } from "./set-piece-kick";
import { wallBlocks } from "./set-piece-wall";
import { PITCH } from "./tuning";
import type { MatchState, SetPiece } from "./types";
import { clamp01 } from "./vec";

const AIMS = [-0.5, -0.4, -0.3, -0.22, -0.15, -0.08, 0, 0.08, 0.15, 0.22, 0.3, 0.4, 0.5];
const CURVES = [-1, -0.6, -0.25, 0, 0.25, 0.6, 1];
const POWERS = [0.25, 0.4, 0.55, 0.7, 0.85];

/**
 * A computer taker lines the kick up like a person would: it tries the
 * aims, curves and powers it could use and keeps the one that beats the
 * wall and ends furthest from the keeper, inside the posts. The level
 * decides how cleanly it then strikes it.
 */
export function planBotFreeKick(state: MatchState, sp: SetPiece): void {
  const defending = other(sp.team);
  const keeperZ = state.keepers[defending].pos.z;
  const line = goalX(defending);
  let best = { aim: 0, curve: 0, power: 0.55, score: -Infinity };
  for (const aim of AIMS) {
    for (const curve of CURVES) {
      for (const power of POWERS) {
        const trial = { ...sp, aim, curve };
        const launch = freeKickLaunch(trial, power);
        const c = crossing(sp.spot, launch, line);
        if (!c || onGoal(c) !== "goal") continue;
        if (wallBlocks(state, trial, launch)) continue;
        // Far from the keeper, a little inside the post, and not too high or too low.
        const room = PITCH.goalHalfWidth - Math.abs(c.z);
        const score = Math.abs(c.z - keeperZ) - (room < 0.35 ? 1 : 0) - Math.abs(c.y - 1.2) * 0.3 + state.rng.range(0, 0.4);
        if (score > best.score) best = { aim, curve, power, score };
      }
    }
  }
  const sloppy = 1 - botSkill(state).accuracy;
  sp.aim = best.aim + state.rng.range(-1, 1) * 0.05 * sloppy;
  sp.curve = Math.max(-1, Math.min(1, best.curve + state.rng.range(-1, 1) * 0.3 * sloppy));
  sp.power = clamp01(best.power + state.rng.range(-1, 1) * 0.1 * sloppy);
}

/** A computer penalty: a corner picked at random, low or high, struck firmly. */
export function planBotPenalty(state: MatchState, sp: SetPiece): void {
  const rng = state.rng;
  const sloppy = 1 - botSkill(state).accuracy;
  const side = rng.sign();
  sp.target = { z: side * rng.range(1.1, PITCH.goalHalfWidth - 0.45), y: rng.chance(0.65) ? rng.range(0.3, 0.8) : rng.range(1.3, 1.9) };
  sp.target.z += rng.range(-1, 1) * 0.6 * sloppy;
  sp.power = clamp01(rng.range(0.5, 0.8) + rng.range(0, 0.2) * sloppy);
}
