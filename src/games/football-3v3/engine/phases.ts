import { botConversion, botPlayCall } from "./bots/calls";
import { planPlay } from "./bots/plan";
import { botSkill } from "./bots/skill";
import { tryDrive } from "./downs";
import { yardToX } from "./field";
import { launch } from "./flight";
import { solveLaunch } from "./aim";
import { lineUp } from "./formation";
import { newKick } from "./kick";
import { engageLine, setLine } from "./linemen";
import type { Match } from "./match";
import { newPlay } from "./play";
import { pickBack } from "./run-play";
import { endOfRegulation } from "./score";
import { PASS, RULES } from "./tuning";
import type { ConversionCall, PlayCall } from "./types";

/** Seconds a snap takes from the center's hands to the QB's. */
export const SNAP_TIME = 0.4;

function enter(m: Match, phase: Match["phase"]): void {
  m.phase = phase;
  m.phaseT = 0;
}

function deadBall(m: Match): void {
  const x = yardToX(m.offense, m.drive.los);
  m.ball.state = "dead";
  m.ball.holder = null;
  m.ball.flight = null;
  m.ball.pass = null;
  m.ball.fumble = null;
  m.ball.pos = { x, y: 0.15, z: m.drive.ballZ };
}

/** Lines up for the next play and asks the QB to pick kick or throw. */
export function startChoose(m: Match): void {
  enter(m, "choose");
  m.play = null;
  m.kick = null;
  lineUp(m.athletes, m.drive, "throw");
  setLine(m);
  deadBall(m);
  m.emit({ type: "choose", team: m.offense, qb: m.qbOf(m.offense).id, conversion: false });
}

/** After a touchdown: set for a try at the two, and ask for kick or two. */
export function startConvert(m: Match): void {
  // The team that scored tries, even after an interception returned for a touchdown.
  const team = m.athlete(m.scorer ?? -1)?.team ?? m.offense;
  m.drive = tryDrive(team, RULES.twoPointSpot);
  enter(m, "convert");
  m.play = null;
  m.kick = null;
  lineUp(m.athletes, m.drive, "throw");
  setLine(m);
  deadBall(m);
  m.emit({ type: "choose", team: m.offense, qb: m.qbOf(m.offense).id, conversion: true });
}

function startPresnap(m: Match, call: "throw" | "run"): void {
  enter(m, "presnap");
  const back = call === "run" ? pickBack(m.athletes, m.offense) : null;
  m.play = newPlay(call, m.time, back);
  // The defence keeps the spots it moved to during the call.
  lineUp(m.athletes.filter((a) => a.team === m.offense || a.role === "lineman"), m.drive, call, back);
  setLine(m);
  deadBall(m);
  for (const a of m.athletes) if (a.team === m.offense || a.role === "lineman") a.action = { kind: "stance", t: 0 };
  planPlay(m);
  m.emit({ type: "lineUp", team: m.offense, down: m.drive.down, toGo: m.drive.firstDownAt - m.drive.los, yardline: m.drive.los });
}

function startKickPlay(m: Match): void {
  enter(m, "kick");
  m.play = newPlay("kick", m.time);
  lineUp(m.athletes, m.drive, "kick");
  setLine(m);
  engageLine(m);
  m.kick = newKick(m);
  const kicker = m.qbOf(m.offense);
  m.ball.state = "dead";
  m.ball.pos = { x: kicker.x + m.sign * 0.6, y: 0.2, z: kicker.z };
}

/** The QB's pick, before a play (throw, run or kick) or for the try after a touchdown. Only the offense's QB decides. */
export function chooseCall(m: Match, id: number, call: PlayCall | ConversionCall): void {
  const qb = m.qbOf(m.offense);
  if (qb.id !== id) return;
  if (m.phase === "choose" && (call === "throw" || call === "run" || call === "kick")) {
    m.emit({ type: "call", team: m.offense, call });
    return call === "kick" ? startKickPlay(m) : startPresnap(m, call);
  }
  if (m.phase === "convert" && (call === "kick" || call === "two")) {
    m.emit({ type: "call", team: m.offense, call });
    if (call === "kick") {
      m.drive = { ...m.drive, los: RULES.kickTrySpot };
      return startKickPlay(m);
    }
    return startPresnap(m, "throw");
  }
}

/** The snap: the center fires the ball back to the QB and the rush is on. */
export function hike(m: Match, auto: boolean): void {
  if (m.phase !== "presnap" || !m.play) return;
  enter(m, "live");
  m.play.sinceSnap = 0;
  m.play.rushOn = true;
  for (const a of m.athletes) if (a.action.kind === "stance") a.action = { kind: "none" };
  const center = m.athletes.find((a) => a.team === m.offense && a.role === "lineman" && a.slot === 1)!;
  const qb = m.qbOf(m.offense);
  const from = { x: center.x, y: 0.4, z: center.z };
  const vel = solveLaunch(from, { x: qb.x, y: PASS.catchHeight, z: qb.z }, SNAP_TIME, "spiral", 30);
  m.ball.state = "snap";
  m.ball.flight = launch(from, vel, "spiral", 30, 0.05);
  engageLine(m);
  m.emit({ type: "hike", id: qb.id, auto });
  m.emit({ type: "rush", team: m.defense });
}

function afterWhistle(m: Match): void {
  if (m.winner !== null) return finishGame(m);
  if (m.clock <= 0) {
    m.emit({ type: "quarterEnd", quarter: m.quarter });
    if (m.overtime) return finishGame(m);
    if (m.quarter >= RULES.quarters) {
      if (endOfRegulation(m) === "over") return finishGame(m);
      m.overtime = true;
      m.emit({ type: "overtime" });
    }
    m.quarter++;
    m.clock = m.quarterSeconds;
  }
  if (m.nextDrive) m.drive = m.nextDrive;
  m.nextDrive = null;
  startChoose(m);
}

function finishGame(m: Match): void {
  enter(m, "over");
  m.emit({ type: "win", team: m.winner });
}

/** The timers between plays, and the computer QB's decisions there. */
export function updatePhase(m: Match): void {
  const qb = m.qbOf(m.offense);
  const beat = 0.9 + Math.min(1.2, botSkill(m.level).reaction * 1.5);
  if (m.phase === "choose") {
    if (qb.auto && m.phaseT >= beat) chooseCall(m, qb.id, botPlayCall(m));
    else if (m.phaseT >= RULES.chooseSeconds) chooseCall(m, qb.id, "throw");
  } else if (m.phase === "convert") {
    if (qb.auto && m.phaseT >= beat) chooseCall(m, qb.id, botConversion(m));
    else if (m.phaseT >= RULES.chooseSeconds) chooseCall(m, qb.id, "kick");
  } else if (m.phase === "presnap") {
    if (qb.auto && m.phaseT >= beat + 0.4) hike(m, false);
    else if (m.phaseT >= RULES.hikeSeconds) hike(m, true);
  } else if (m.phase === "dead") {
    if (m.phaseT >= RULES.deadSeconds) afterWhistle(m);
  } else if (m.phase === "touchdown") {
    if (m.phaseT >= RULES.touchdownSeconds) {
      if (m.winner !== null) finishGame(m);
      else startConvert(m);
    }
  }
}
