import { buildOf } from "./athlete";
import { applyHit, presetName } from "./blocks/hit";
import { planBlocks } from "./blocks/plan";
import { contestFor } from "./contest";
import { isThree, rimDistance } from "./court";
import { callShootingFoul } from "./foul-call";
import { missShot } from "./rules";
import type { Match } from "./match";
import { freshTrack, traceShot } from "./physics/shot-watch";
import { between } from "./rng";
import { layupEvade, layupInput } from "./finish/layup-release";
import { newFlight } from "./shot-outcome/flight";
import { pickPreset, type ShotQuality } from "./shot-outcome/pick";
import { asPreset } from "./shot-outcome/presets";
import { solvePreset } from "./shot-outcome/solve";
import { bankAngle, makeChance, type Grade, type ShotContext, type ShotKind } from "./shot-model";
import { planRelease, type ReleaseInput } from "./shot-release";
import { shotBalance } from "./shot-balance";
import { rollShootingFoul } from "./shooting-foul";
import { RIM } from "./tuning";
import type { Athlete, ShotInfo } from "./types";
import { clamp, type V3 } from "./vec";

/** A shot fouled in the act goes in this share as often as it would have. */
const FOULED_MAKE = 0.4;

/** How the shooter throws it: a set shot or jumper, a floater, a layup off the glass or straight in. */
function release(m: Match, a: Athlete, kind: ShotKind, hand: V3, distance: number, floater: boolean): ReleaseInput {
  const side = Math.atan2(a.x - RIM.x, a.z - RIM.z);
  // Each layup preset throws it its own way (see `finish/layup-release.ts`).
  if (kind === "layup") return layupInput(m.rng, a.action.kind === "drive" ? (a.action.layup ?? "finger") : "finger", hand, distance);
  if (floater) return { family: "floater", from: hand, apex: RIM.y + between(m.rng, 1.3, 1.55), spinRate: between(m.rng, 3, 6) };
  const free = kind === "free";
  const bank = !free && distance < 6.2 && m.rng() < 0.12 * bankAngle(side, distance);
  const apex = RIM.y + 0.95 + distance * 0.12 + between(m.rng, -0.1, 0.15);
  // A jumper leaves with two and a half turns of backspin.
  return { family: free ? "free" : bank ? "bankJumper" : "jumper", from: hand, apex, spinRate: between(m.rng, 13, 17) };
}

/**
 * The ball leaves the hand: size up the defence, see if the shot is
 * fouled, work out how good the release was, pick how it ends, and
 * throw the real flight that ends that way (`shot-outcome/`). A
 * defender in the air may still get a hand to it on the way (see
 * `ball-touch.ts`), and then the physics alone has it.
 */
export function launchShot(m: Match, a: Athlete, kind: ShotKind, grade: Grade, hand: V3, floater = false): void {
  const b = m.ball;
  const distance = rimDistance(a);
  const three = kind === "jumper" && isThree(a);
  const free = kind === "free";
  // Nobody may contest a free throw.
  const c = contestFor(a, free ? [] : m.opponents(a.team), kind);
  // A layup made to go round the man (a scoop, a reverse, a shield) takes much of the sting out of his contest.
  const evade = kind === "layup" && a.action.kind === "drive" ? layupEvade(a.action.layup) : 0;
  c.contest *= 1 - evade * 0.6;
  if (free) a.box.freeAttempts++;
  else a.box.attempts++;
  letGo(m, a, hand);
  const scripted = m.forced;
  m.forced = null;
  // Gold is a sure swish: no hand gets to it, and it goes in clean even through a foul.
  const gold = grade === "gold";
  // Contact on the shot is a foul, and a fouled shot flies on and may still drop.
  // A block set up by the lab is never fouled, so the scene always plays the block.
  const fouler = scripted || free || m.forcedHit ? null : rollShootingFoul(m, a, kind, evade);
  if (fouler) callShootingFoul(m, fouler, a, three ? 3 : 2);
  b.shot = shotInfo(m, a, kind, grade, three ? 3 : free ? 1 : 2, c.contest, distance);
  // A scripted film, a gold release and a fouled shot fly clear of hands.
  if (scripted || gold || fouler) b.shot.rolled = m.opponents(a.team).map((o) => o.id);
  b.shot.evade = evade;
  const s = buildOf(a).stats;
  const ctx: ShotContext = { kind, grade, distance, shooting: s.shooting, contest: c.contest, strengthEdge: c.edge, onFire: a.onFire, floater, offBalance: kind === "jumper" ? shotBalance(a) : 0 };
  const chance = makeChance(ctx) * (fouler ? FOULED_MAKE : 1);
  const input = release(m, a, kind, hand, distance, floater);
  const side = Math.atan2(a.x - RIM.x, a.z - RIM.z);
  // A reverse is flipped up from under the ring, with no angle on the glass.
  const bankable = input.family === "reverse" ? 0 : bankAngle(side, distance);
  const quality: ShotQuality = { kind, grade, family: input.family, chance, distance, contest: c.contest, bankable };
  const pick = scripted ? { preset: asPreset(scripted), lean: 0 } : pickPreset(m.rng, quality);
  const plan = solvePreset(m.rng, input, pick.preset, pick.lean);
  b.vel = plan.launch.vel;
  b.w = plan.launch.spin;
  b.shot.flight = newFlight(plan.ride);
  b.shot.preset = plan.preset;
  // Anyone already up gets his touch or near miss decided now, on the real flight.
  planBlocks(m);
  // The ending is known now, for the sounds and buzzes that want it early; the live ball still flies it out.
  m.emit({ type: "shot", id: a.id, kind, three, grade, chance, outcome: plan.detail.outcome, preset: plan.preset, made: plan.detail.made, contest: c.contest });
}

/** The ball leaves the hand. */
function letGo(m: Match, a: Athlete, at: V3): void {
  const b = m.ball;
  b.holder = null;
  b.mode = "flight";
  b.flightT = 0;
  b.flightKind = "shot";
  b.lastTouch = a.id;
  b.pos = { ...at };
  b.hand = "none";
  b.passTo = null;
  b.aim = null;
}

function shotInfo(m: Match, a: Athlete, kind: ShotKind, grade: Grade, points: 1 | 2 | 3, contest: number, distance: number): ShotInfo {
  const assist = kind !== "free" && m.lastPass && m.lastPass.to === a.id ? m.lastPass.from : null;
  const dunk = kind === "dunk" ? (a.action.kind === "drive" && a.action.style ? a.action.style : buildOf(a).dunk) : null;
  return { shooter: a.id, team: a.team, points, kind, dunk, grade, outcome: "swish", preset: "swish", made: false, counted: false, touchedRim: kind === "dunk", assist, contest, distance, track: freshTrack(), flight: newFlight(null), rolled: [], evade: 0 };
}

/**
 * The slam: the hand, already over the ring with the ball (see
 * `finish/plan.ts`), drives it down through the net.
 * A defender who got up in time may swat it at the rim, and a slam put
 * off line by contact can come off the iron.
 */
export function slam(m: Match, a: Athlete, hand: V3): void {
  const b = m.ball;
  const c = contestFor(a, m.opponents(a.team), "dunk");
  // From the hand, over the ring: the ball is pushed down from where the hand really has it.
  const top = { ...hand };
  a.box.attempts++;
  letGo(m, a, top);
  const forced = m.forced;
  m.forced = null;
  const fouler = forced ? null : rollShootingFoul(m, a, "dunk");
  if (fouler) callShootingFoul(m, fouler, a, 2);
  b.shot = shotInfo(m, a, "dunk", "perfect", 2, c.contest, 0.5);
  b.shot.rolled = m.opponents(a.team).map((o) => o.id);
  if (!forced && !fouler && c.blocker && m.rng() < c.blockChance) {
    const d = c.blocker;
    const strong = buildOf(d).stats.strength >= 7;
    // Met at the rim: a big man spikes it away now and then, anyone else swats it.
    const hit = strong && m.rng() < 0.35 ? "spike" : "swat";
    applyHit(m, b, hit);
    b.flightKind = "block";
    b.shot.outcome = "airball";
    b.lastTouch = c.blocker.id;
    c.blocker.box.blocks++;
    const style = d.action.kind === "block" ? d.action.style : "stand";
    m.emit({ type: "block", id: d.id, victim: a.id, tip: false, at: { ...top }, hit, preset: presetName(style, hit, "dunk") });
    missShot(m);
    return;
  }
  const ctx: ShotContext = { kind: "dunk", grade: "perfect", distance: 0.5, shooting: 5, contest: c.contest, strengthEdge: c.edge, onFire: a.onFire };
  const chance = makeChance(ctx) * (fouler ? FOULED_MAKE + 0.15 : 1);
  const input: ReleaseInput = { family: "dunk", from: top, apex: top.y, spinRate: 0 };
  const launch = forced ? solvePreset(m.rng, input, asPreset(forced)).launch : planRelease(m.rng, input, chance, 0.5);
  b.vel = launch.vel;
  b.w = launch.spin;
  // The hand is on the iron as it goes down: no swish for a dunk.
  b.shot.track.first = "rim";
  const ahead = traceShot({ pos: { ...top }, vel: launch.vel, w: launch.spin });
  if (ahead.made) {
    m.emit({ type: "rim", power: 1 });
    const power = clamp(0.5 + buildOf(a).stats.strength * 0.05, 0.5, 1);
    m.emit({ type: "dunk", id: a.id, style: b.shot.dunk ?? buildOf(a).dunk, power });
    return;
  }
  m.emit({ type: "shot", id: a.id, kind: "dunk", three: false, grade: "perfect", chance, outcome: ahead.outcome, preset: "rimOut", made: false, contest: c.contest });
}
