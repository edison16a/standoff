import { updateBall } from "./ball-update";
import { ceremonyTime, stepCeremony } from "./ceremony";
import { guardMove } from "./guard";
import { holdOnside } from "./formation";
import { FIELD, xToYard, yardToX } from "./field";
import { updateJuke } from "./juke";
import { updateKick } from "./kick";
import { lineContact, updateLinemen } from "./linemen";
import type { Match } from "./match";
import { moveAthlete } from "./motion";
import { updateTarget, updateThrow } from "./passing";
import { separate } from "./collide";
import { updateDive, updateDown, updateLunge } from "./tackle";
import { updatePhase } from "./phases";
import { JUKE } from "./tuning";
import { endPlay } from "./whistle";
import type { Athlete } from "./types";

function tick(a: Athlete, dt: number): void {
  a.jukeCd = Math.max(0, a.jukeCd - dt);
  a.jukeHeat = Math.max(0, a.jukeHeat - JUKE.cool * dt);
  a.tackleCd = Math.max(0, a.tackleCd - dt);
  a.rushT = Math.max(0, a.rushT - dt);
  a.rushCd = Math.max(0, a.rushCd - dt);
  a.blocked = Math.max(0, a.blocked - dt);
}

function act(m: Match, a: Athlete, dt: number): void {
  const now = a.action;
  if (now.kind === "juke") updateJuke(a, dt);
  else if (now.kind === "lunge") updateLunge(m, a, dt);
  else if (now.kind === "dive") updateDive(m, a, dt);
  else if (now.kind === "down") updateDown(a, dt);
  else if (now.kind === "throw") updateThrow(m, a, dt);
  else if (now.kind === "stance") now.t += dt;
  else if (now.kind === "celebrate") {
    now.t += dt;
    if (now.t >= now.dur) a.action = { kind: "none" };
  }
}

/**
 * Who may move now. The defence sets itself while the offense calls the
 * play and lines up; in the break between plays and during a kick
 * everyone waits.
 */
function frozen(m: Match, a: Athlete): boolean {
  if (m.phase === "live" || m.phase === "touchdown") return false;
  if (settingUp(m)) return a.team === m.offense;
  return true;
}

const settingUp = (m: Match) => m.phase === "presnap" || m.phase === "choose" || m.phase === "convert";

/** The checks that end a live play: a score, stepping out, and the QB running past the line. */
function liveChecks(m: Match): void {
  const c = m.carrier();
  const play = m.play;
  if (!c || !play) return;
  if (xToYard(c.team, c.x) >= 100 && Math.abs(c.z) <= FIELD.halfWidth) return endPlay(m, "touchdown");
  if (Math.abs(c.z) > FIELD.halfWidth || Math.abs(c.x) > FIELD.endX) return endPlay(m, "out");
  if (c.role === "qb" && c.team === m.offense && !play.passed) {
    const past = (c.x - yardToX(m.offense, m.drive.los)) * m.sign;
    if (past > 0.5) play.crossed = true;
  }
}

/** One fixed step of the whole field: timers, phase, players, linemen, contact and the ball. */
export function stepWorld(m: Match, dt: number): void {
  // After the cut the end of the game is the trophy presentation, which moves everyone itself.
  if (ceremonyTime(m) !== null) return stepCeremony(m, dt);
  for (const a of m.athletes) tick(a, dt);
  updatePhase(m);
  const live = m.phase === "live";
  if (live && m.play) {
    m.play.sinceSnap = (m.play.sinceSnap ?? 0) + dt;
    m.clock = Math.max(0, m.clock - dt);
    updateTarget(m);
  }
  if (m.phase === "kick") updateKick(m, dt);
  const holder = m.ball.state === "held" ? m.ball.holder : null;
  const face = { x: m.ball.pos.x, z: m.ball.pos.z };
  for (const a of m.athletes) {
    if (a.role === "lineman") continue;
    act(m, a, dt);
    // The stick is kept as sent; freezing and Guard only steer this one step.
    const stick = a.move;
    if (frozen(m, a)) a.move = { x: 0, z: 0 };
    else if (live && a.guard !== null) a.move = guardMove(m, a, a.guard);
    moveAthlete(a, dt, holder === a.id, face);
    a.move = stick;
    if (settingUp(m)) holdOnside(a, m.drive);
  }
  updateLinemen(m, dt);
  if (live) lineContact(m);
  separate(m, m.bumps);
  updateBall(m, dt);
  if (m.phase === "live") liveChecks(m);
}
