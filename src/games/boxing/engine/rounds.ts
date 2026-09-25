import { TOUCH_RANGE } from "./footwork";
import type { Match } from "./match";
import { RULES } from "./rules";
import { decision } from "./scoring";

/** Waiting for the gloves to touch before a round. */
export interface TouchState {
  /** Since when both boxers have held their gloves out, while they still do. */
  heldSince: number | null;
  /** When the gloves met, or the referee gave up waiting. */
  touchedAt: number | null;
}

/** The walk out to the middle. Then the gloves touch, or the bell goes straight away. */
export function stepIntro(match: Match): void {
  if (match.now < match.phaseEnds) return;
  if (match.touchGloves) startTouch(match);
  else startRound(match);
}

/**
 * Face to face in the middle, both boxers hold their gloves out. Once
 * both have held them there a moment, the gloves touch, and the bell
 * goes a beat later. A boxer who never does it is not waited for
 * forever: the referee waves them on.
 */
export function stepTouch(match: Match): void {
  const touch = match.touch!;
  const now = match.now;
  if (touch.touchedAt !== null) {
    if (now >= touch.touchedAt + RULES.touchMs) startRound(match);
    return;
  }
  const close = match.footwork.distance() <= TOUCH_RANGE + 0.12;
  const ready = close && match.fighters.every((f) => f.input.reach);
  if (ready) touch.heldSince ??= now;
  else touch.heldSince = null;
  const held = touch.heldSince !== null && now - touch.heldSince >= RULES.touchHoldMs;
  if (held || now >= match.phaseEnds) {
    touch.touchedAt = now;
    match.emit({ type: "touch", timedOut: !held });
  }
}

/**
 * Between rounds: the boxers walk to their corners, sit on their stools
 * and get some health back, then walk back out to the middle.
 */
export function stepBreak(match: Match, dtMs: number): void {
  const stage = match.breakStage;
  if (stage === "rest") {
    const restMs = Math.max(1, match.breakMs - RULES.cornerWalkMs - RULES.walkOutMs);
    for (const fighter of match.fighters) fighter.heal((RULES.breakHeal * dtMs) / restMs);
  }
  if (stage === "out") match.footwork.setMode(match.touchGloves ? "centre" : "fight");
  if (match.now < match.phaseEnds) return;
  match.round++;
  if (match.touchGloves) startTouch(match);
  else startRound(match);
}

export function startRound(match: Match): void {
  match.roundClock = 0;
  match.warned = false;
  match.touch = null;
  match.setPhase("fight");
  match.footwork.setMode("fight");
  match.emit({ type: "round", round: match.round });
  match.emit({ type: "bell", kind: "start" });
}

export function endRound(match: Match): void {
  for (const fighter of match.fighters) fighter.breakReset();
  if (match.round >= match.rounds) {
    match.emit({ type: "bell", kind: "final" });
    match.finish(decision(match.fighters[0], match.fighters[1], match.rounds));
    return;
  }
  match.emit({ type: "bell", kind: "end" });
  match.setPhase("break", match.breakMs);
  match.footwork.setMode("corners");
}

function startTouch(match: Match): void {
  match.touch = { heldSince: null, touchedAt: null };
  match.setPhase("touch", RULES.touchTimeoutMs);
  match.footwork.setMode("centre");
}
