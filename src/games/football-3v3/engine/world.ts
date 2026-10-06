import { updateBall } from "./ball-update";
import { ceremonyTime, stepCeremony } from "./ceremony";
import { FIELD, xToYard, yardToX } from "./field";
import { updateJuke } from "./juke";
import { jukeBeats, updateStumble } from "./juke-beat";
import { updateKick } from "./kick";
import { lineContact } from "./linemen";
import type { Match } from "./match";
import { updateTarget, updateThrow } from "./passing";
import { stepBodies } from "./bodies";
import { updateFumble } from "./fumble";
import { updateDive } from "./dive";
import { updateDown } from "./down";
import { updateLunge } from "./tackle";
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
  a.stagger = Math.max(0, a.stagger - dt);
  updateStumble(a, dt);
}

function act(m: Match, a: Athlete, dt: number): void {
  const now = a.action;
  if (now.kind === "juke") {
    updateJuke(a, dt);
    if (m.carrier() === a) jukeBeats(m.athletes, a, dt);
  }
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

/** The checks that end a live play: a score, stepping out, and the QB running past the line. */
function liveChecks(m: Match): void {
  const c = m.carrier();
  const play = m.play;
  if (!c || !play) return;
  if (xToYard(c.team, c.x) >= 100 && Math.abs(c.z) <= FIELD.halfWidth) return endPlay(m, "touchdown");
  if (Math.abs(c.z) > FIELD.halfWidth || Math.abs(c.x) > FIELD.endX) return endPlay(m, "out");
  if (c.role === "qb" && c.team === m.offense && !play.passed) {
    const past = (c.x - yardToX(m.offense, m.drive.los)) * m.sign;
    // Past the line he is a runner for good, as if he had pressed Run.
    if (past > 0.5) play.qbRun = true;
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
  // Linemen move with their pair; a juke can still put one on the turf for a moment.
  for (const a of m.athletes) {
    if (a.role !== "lineman") act(m, a, dt);
    else updateDown(a, dt);
  }
  stepBodies(m, dt);
  if (live) lineContact(m);
  updateBall(m, dt);
  updateFumble(m);
  if (m.phase === "live") liveChecks(m);
}
