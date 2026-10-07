import { breaksPair, type BlockKind } from "../engine/block-preset";
import type { CatchKind, CatchResult } from "../engine/catch-preset";
import { tracePath } from "../engine/catch/path";
import { newDrive } from "../engine/downs";
import { breakPair } from "../engine/line-free";
import type { Entry } from "../engine/lineup";
import { Match } from "../engine/match";
import { startChoose } from "../engine/phases";
import { STEP } from "../engine/tuning";
import type { Athlete, PlayCall } from "../engine/types";
import { buildView, type AthleteView, type BallView } from "../engine/view";

/**
 * Staged passes and line play for the animation lab, run on a whole
 * match with the real engine: a snap, a throw to a receiver set up just
 * so, and the catch, pick or swat the game logic picks for it. The hands
 * and the dice still decide, so each stage tries seeds until the move
 * and its finish are the ones it is there to show. Spots are metres
 * from the QB (or the receiver, for a defender) along the offense's way
 * `f` and across the field `c`.
 */
export interface PassStage {
  call: PlayCall;
  wr?: { at: [number, number]; move?: [number, number] };
  d?: { at: [number, number]; move?: [number, number]; auto?: boolean };
  /** Seconds after the snap the QB lets it go. */
  throwAt?: number;
  /** A shove off his spot just after the throw, so the ball is led past him. */
  shift?: [number, number];
  /** Metres a second added to the ball's climb, for one that arrives high. */
  loft?: number;
  /** Nobody read the throw: a computer defender in the lane can only get a hand to it. */
  unread?: boolean;
  want?: { who: "wr" | "d"; kind: CatchKind; result: CatchResult };
  /** A block move forced on the middle pair from this many seconds after the snap. */
  block?: { kind: BlockKind; at: number };
  length: number;
}

export interface PassFrame {
  athletes: AthleteView[];
  ball: BallView;
}

const ENTRIES: Entry[] = [
  { team: 0, role: "qb", build: "gunslinger", seat: 0 },
  { team: 0, role: "runner", build: "routerunner", seat: 1 },
  { team: 1, role: "qb", build: "scrambler", seat: 2 },
  { team: 1, role: "runner", build: "lockdown", seat: 3 },
];

/** Runs the stage on seed after seed until it shows what it is for, and keeps every frame of that run. */
export function recordPass(stage: PassStage): { frames: PassFrame[]; shown: boolean } {
  let run = attempt(stage, 1);
  for (let seed = 2; seed <= 40 && !run.shown; seed++) run = attempt(stage, seed);
  return run;
}

function attempt(stage: PassStage, seed: number): { frames: PassFrame[]; shown: boolean } {
  const m = new Match({ entries: ENTRIES, seed, firstOffense: 0, level: "hard" });
  m.drive = { ...newDrive(0, 40), down: 1 };
  startChoose(m);
  const qb = m.bySeat(0)!;
  const wr = m.bySeat(1)!;
  const d = m.bySeat(3)!;
  m.choose(qb.id, stage.call);
  m.press(qb.id, "hike");
  // Line play is watched from the snap, over the middle pair; a pass from the throw, over the receiver.
  const pair = m.lines[1]!;
  const lineAt = { x: pair.x, z: pair.z };
  const frames: PassFrame[] = [];
  for (let i = 0; i < 240 && m.carrier() !== qb; i++) {
    m.step(STEP);
    if (stage.block) frames.push(turned(m, lineAt));
  }
  const s = m.sign;
  const spot = (o: { x: number; z: number }, [f, c]: [number, number]) => ({ x: o.x + f * s, z: o.z + c });
  if (stage.wr) Object.assign(wr, spot(qb, stage.wr.at));
  if (stage.wr?.move) m.setMove(wr.id, { x: stage.wr.move[0] * s, z: stage.wr.move[1] });
  if (stage.d) Object.assign(d, spot(wr, stage.d.at), { auto: !!stage.d.auto });
  else Object.assign(d, spot(qb, [40, 0]));
  if (stage.d?.move) m.setMove(d.id, { x: stage.d.move[0] * s, z: stage.d.move[1] });
  // The other side's QB is out of the picture.
  Object.assign(m.bySeat(2)!, spot(qb, [45, 8]));
  const origin = stage.wr ? { x: wr.x, z: wr.z } : lineAt;
  const who = stage.want?.who === "d" ? d : wr;
  let shown = !stage.want;
  let thrown = false;
  let since = 0;
  for (let t = 0; t < stage.length; t += STEP) {
    since += STEP;
    if (stage.wr && !thrown && since >= (stage.throwAt ?? 0.4)) {
      m.setAim(qb.id, { x: wr.x - qb.x, z: wr.z - qb.z });
      m.step(STEP);
      m.setAim(qb.id, null);
      thrown = true;
    }
    if (stage.block && since >= stage.block.at) force(m, stage.block.kind);
    const before = m.ball.state;
    m.step(STEP);
    if (before !== "pass" && m.ball.state === "pass") afterThrow(m, wr, stage);
    const p = who.catching;
    if (stage.want && p && p.kind === stage.want.kind && p.result === stage.want.result) shown = true;
    frames.push(turned(m, origin));
  }
  return { frames, shown };
}

/** The ball just left the hand: shove the receiver off his spot, loft it or leave it unread, as the stage asks. */
function afterThrow(m: Match, wr: Athlete, stage: PassStage): void {
  if (stage.shift) {
    wr.x += stage.shift[0] * m.sign;
    wr.z += stage.shift[1];
  }
  if (stage.unread && m.ball.pass) m.ball.pass.interceptor = null;
  const f = m.ball.flight;
  if (stage.loft && f && m.ball.pass) {
    f.vel.y += stage.loft;
    m.ball.pass.path = tracePath(f, m.time);
  }
}

/** Holds the middle pair in a block move, breaking it up for a pancake or a shed the way the game does. */
function force(m: Match, kind: BlockKind): void {
  const p = m.lines[1]!;
  if (p.move.kind === kind || p.loose || !p.engaged) return;
  // No more shoves for this pair: the forced move is the one it keeps.
  p.next = Infinity;
  p.move = { kind, t: 0 };
  if (!breaksPair(kind)) return;
  const man = (team: 0 | 1) => m.athletes.find((a) => a.role === "lineman" && a.team === team && a.slot === 1)!;
  breakPair(m, p, man(m.offense), man(m.defense), kind);
}

/** The match's still turned so the offense goes up +z from `origin`, the lab's frame. */
function turned(m: Match, origin: { x: number; z: number }): PassFrame {
  const v = buildView(m);
  const a = -m.sign * (Math.PI / 2);
  const c = Math.cos(a);
  const sn = Math.sin(a);
  const rot = (x: number, z: number) => ({ x: x * c + z * sn, z: -x * sn + z * c });
  const athletes = v.athletes.map((p) => {
    const at = rot(p.x - origin.x, p.z - origin.z);
    const vel = rot(p.vx, p.vz);
    const acc = rot(p.ax, p.az);
    return { ...p, x: at.x, z: at.z, vx: vel.x, vz: vel.z, ax: acc.x, az: acc.z, yaw: p.yaw + a };
  });
  const b = v.ball;
  const at = rot(b.x - origin.x, b.z - origin.z);
  const vel = rot(b.vx, b.vz);
  const axis = rot(b.axis.x, b.axis.z);
  // The ball's turn about the vertical by the same angle: r * q.
  const ry = Math.sin(a / 2);
  const rw = Math.cos(a / 2);
  const q = b.quat;
  const quat = { x: rw * q.x + ry * q.z, y: rw * q.y + ry * q.w, z: rw * q.z - ry * q.x, w: rw * q.w - ry * q.y };
  const knock = b.knock && { ...b.knock, n: { ...rot(b.knock.n.x, b.knock.n.z), y: b.knock.n.y } };
  return { athletes, ball: { ...b, x: at.x, z: at.z, vx: vel.x, vz: vel.z, axis: { ...axis, y: b.axis.y }, quat, knock } };
}
