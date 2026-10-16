import { botConversion, botPlayCall } from "./bots/calls";
import { restoreControl } from "./control";
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
import type { PlayDesign } from "./playbook/deal";
import { dealHuddle, huddleLeft, redeal } from "./playbook/huddle";
import { pickBack } from "./run-play";
import { endOfRegulation } from "./score";
import { touchdownEnd } from "./score-runout";
import { PASS, RULES } from "./tuning";
import type { ConversionCall, PlayCall } from "./types";

/** Seconds a snap takes from the center's hands to the QB's. */
export const SNAP_TIME = 0.4;

/** Phases that line up afresh: every phone goes back to its own player. */
const FRESH: ReadonlySet<Match["phase"]> = new Set(["choose", "convert", "kick", "over"]);

function enter(m: Match, phase: Match["phase"]): void {
  m.phase = phase;
  m.phaseT = 0;
  m.huddle = null;
  if (FRESH.has(phase)) restoreControl(m);
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

function startPresnap(m: Match, call: "throw" | "run", design: PlayDesign | null = null, runners: number[] = []): void {
  enter(m, "presnap");
  const back = call === "run" ? pickBack(m.athletes, m.offense) : null;
  m.play = newPlay(call, m.time, back, design, runners);
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

/**
 * Throw or Run picked: a person's QB gets a page of plays to pick from;
 * a computer QB picks one at once. The game played as it was filmed has
 * no playbook and lines straight up.
 */
function callFor(m: Match, call: "throw" | "run"): void {
  if (m.filmed) return startPresnap(m, call);
  const page = dealHuddle(m, call);
  if (page.plays.length === 0) return startPresnap(m, call);
  if (!m.qbOf(m.offense).auto) {
    m.huddle = page;
    return;
  }
  startPresnap(m, call, m.playRng.pick(page.plays), page.runners);
}

/** The QB's pick, before a play (throw, run or kick) or for the try after a touchdown. Only the offense's QB decides. */
export function chooseCall(m: Match, id: number, call: PlayCall | ConversionCall): void {
  const qb = m.qbOf(m.offense);
  if (qb.id !== id || m.huddle) return;
  if (m.phase === "choose" && (call === "throw" || call === "run" || call === "kick")) {
    m.emit({ type: "call", team: m.offense, call });
    return call === "kick" ? startKickPlay(m) : callFor(m, call);
  }
  if (m.phase === "convert" && (call === "kick" || call === "two")) {
    m.emit({ type: "call", team: m.offense, call });
    if (call === "kick") {
      m.drive = { ...m.drive, los: RULES.kickTrySpot };
      return startKickPlay(m);
    }
    return callFor(m, "throw");
  }
}

/** The QB on his page of plays: pick one by its place, deal a fresh page, or go back to the call with a fresh clock. */
export function huddleAction(m: Match, id: number, action: number | "redeal" | "back"): void {
  const h = m.huddle;
  if (!h || m.qbOf(m.offense).id !== id) return;
  if (action === "redeal") m.huddle = redeal(m, h);
  else if (action === "back") {
    m.huddle = null;
    m.phaseT = 0;
  } else {
    const design = h.plays[action];
    if (design) startPresnap(m, h.call, design, h.runners);
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
  if (m.huddle) {
    // A page left too long calls its first play, and so does a QB whose phone dropped.
    if (huddleLeft(m.huddle, m.time) <= 0 || qb.auto) huddleAction(m, qb.id, 0);
  } else if (m.phase === "choose") {
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
    if (m.phaseT >= touchdownEnd(m)) {
      if (m.winner !== null) finishGame(m);
      else startConvert(m);
    }
  }
}
