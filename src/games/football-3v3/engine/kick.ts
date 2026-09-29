import { statsOf } from "./body";
import { kickLeg } from "./build-effects";
import { botSkill } from "./bots/skill";
import { kickIsFieldGoal } from "./formation";
import { bestFieldGoalPower, launchKick, updateKickFlight } from "./kick-flight";
import type { Match } from "./match";
import { KICK } from "./tuning";
import type { Athlete } from "./types";
import { clamp } from "./vec";

/**
 * A kick, from the meters to the ball coming down. First a marker sweeps
 * left and right: stop it in the green for a straight kick. Then a
 * marker climbs and falls: stop it high for a long one.
 */
export interface KickState {
  kicker: number;
  fieldGoal: boolean;
  conversion: boolean;
  stage: "aim" | "power" | "windup" | "flight" | "done";
  /** Seconds in the current stage, which drives the meters. */
  t: number;
  aim: number | null;
  power: number | null;
  /** A computer kicker's picks and when it makes them. */
  botAim: number;
  botPower: number;
  botAt: number;
  bounces: number;
}

/** The accuracy marker, -1 (left) to 1 (right), starting at the left. */
export function meterAim(t: number): number {
  const u = (t / KICK.aimPeriod) % 1;
  return u < 0.5 ? -1 + 4 * u : 3 - 4 * u;
}

/** The power marker, 0 (bottom) to 1 (top), starting at the bottom. */
export function meterPower(t: number): number {
  const u = (t / KICK.powerPeriod) % 1;
  return u < 0.5 ? 2 * u : 2 - 2 * u;
}

/** In the green: a kick that goes where it is aimed. */
export const inGreen = (aim: number) => Math.abs(aim) <= KICK.green;

export function newKick(m: Match): KickState {
  const kicker = m.qbOf(m.offense);
  const skill = botSkill(m.level);
  const fieldGoal = kickIsFieldGoal(m.drive);
  const power = fieldGoal ? bestFieldGoalPower(m, kicker) : 0.85;
  return {
    kicker: kicker.id, fieldGoal, conversion: m.drive.conversion, stage: "aim", t: 0, aim: null, power: null,
    botAim: m.rng.gauss((1 - skill.accuracy) * 0.35),
    botPower: clamp(power + m.rng.gauss((1 - skill.accuracy) * 0.12), 0.2, 1),
    botAt: 0.5 + Math.min(1.5, skill.reaction * 1.5),
    bounces: 0,
  };
}

function lock(m: Match, k: KickState, value: number | undefined): void {
  if (k.stage === "aim") {
    k.aim = clamp(value ?? meterAim(k.t), -1, 1);
    m.emit({ type: "meter", stage: "aim", value: k.aim });
    k.stage = "power";
    k.t = 0;
  } else if (k.stage === "power") {
    k.power = clamp(value ?? meterPower(k.t), 0, 1);
    m.emit({ type: "meter", stage: "power", value: k.power });
    k.stage = "windup";
    k.t = 0;
    const kicker = m.athlete(k.kicker)!;
    kicker.action = { kind: "kick", t: 0, dur: KICK.windup + 0.5, released: false };
  }
}

/** The kick button. Only the kicker's press counts, once per meter. */
export function pressKick(m: Match, a: Athlete, value?: number): void {
  const k = m.kick;
  if (m.phase !== "kick" || !k || a.id !== k.kicker) return;
  lock(m, k, value);
}

export function updateKick(m: Match, dt: number): void {
  const k = m.kick;
  if (!k) return;
  k.t += dt;
  const kicker = m.athlete(k.kicker)!;
  if (k.stage === "aim" || k.stage === "power") {
    // A computer kicker stops each meter after a beat; a person who never presses gets it stopped for them.
    if (kicker.auto && k.t >= k.botAt) lock(m, k, k.stage === "aim" ? k.botAim : k.botPower);
    else if (k.t >= KICK.meterLimit) lock(m, k, undefined);
    return;
  }
  if (k.stage === "windup") {
    const act = kicker.action;
    if (act.kind === "kick") act.t += dt;
    if (k.t >= KICK.windup) {
      if (act.kind === "kick") act.released = true;
      launchKick(m, k, kicker, kickLeg(statsOf(kicker)));
      k.stage = "flight";
      k.t = 0;
    }
    return;
  }
  const act = kicker.action;
  if (act.kind === "kick") {
    act.t += dt;
    if (act.t >= act.dur) kicker.action = { kind: "none" };
  }
  if (k.stage === "flight") updateKickFlight(m, k, dt);
}
