import { hand } from "../hands/grips";
import { play, type Key } from "../keyframes";
import { add, attach, mix, type GunPose, type HandPose, type V3 } from "../pose";
import { MAG_HOME, TRAVEL } from "../rest";
import { at, envelope, FROM_POUCH, holdMag, jolts, liftBody, palmUnder, type ReloadInput } from "./common";

const HOME = MAG_HOME.smg;
const ZERO: V3 = [0, 0, 0];
const ON_MAG = holdMag([-0.016, -0.06, 0.014]);
/** The base plate is tipped well forward at the bottom of the curve. */
const SLAP = palmUnder([0, -0.21, -0.05], 0.45);
/** The cocking handle's knob, forward and turned up into its notch. */
const KNOB: V3 = [-0.033, 0.034, -0.302];
const KNOB_UP: V3 = [-0.017, 0.052, -0.302];
/** The left hand over the tube, fingers hooked round the knob. */
const ON_HANDLE = hand([-0.045, 0.05, -0.256], [0.45, -0.89, 0], [0, 0, -1], 0.85, 0.85, 0.7);
/** The flat of the hand coming down on the locked handle: the HK slap. */
const SLAP_HANDLE = hand([-0.03, 0.064, -0.212], [0.6, -0.8, 0], [0, 0, -1], 0.15, 0.1, 0.2);

type Place = { pos: V3; rot: V3 };

/** The hand on the handle, wherever the handle is along its slot and however far up. */
function onHandle(back: number, up: number): HandPose {
  const lifted = mix(KNOB, KNOB_UP, up);
  return { ...ON_HANDLE, pos: add(ON_HANDLE.pos, [lifted[0] - KNOB[0], lifted[1] - KNOB[1], back * TRAVEL.smg.handle]) };
}

/** The slapping hand `above` metres up and out from the handle. */
const slapping = (above: number): HandPose => ({ ...SLAP_HANDLE, pos: add(SLAP_HANDLE.pos, [-above * 0.7, above, 0]) });

/**
 * The MP5's reload. From empty the left hand first pulls the cocking
 * handle back and flips it up into its notch, which holds the bolt open.
 * Then the magazine is pulled straight down and dropped, and the fresh
 * one pushed up into the well and tapped home. From empty the reload ends
 * with the slap: the handle is knocked down out of its notch and slams
 * forward. A reload with rounds left is only the magazine change.
 */
export function smgReload(pose: GunPose, input: ReloadInput): GunPose {
  const { t, empty } = input;
  const back = at(input, "bolt-back");
  const release = at(input, "mag-release");
  const out = at(input, "mag-out");
  const magIn = at(input, "mag-in");
  const seat = at(input, "mag-seat");
  const forward = at(input, "bolt-forward");
  const settle = at(input, "settle");
  const grab = release - 0.06;
  const letGo = out + 0.05;
  const fetch = letGo + (magIn - letGo) * 0.3;
  const pushed = magIn + (seat - magIn) * 0.5;

  const oldPath: Key<Place>[] = [
    [release, { pos: ZERO, rot: ZERO }],
    [out, { pos: [0, -0.045, 0], rot: [0.05, 0, 0] }, "in"],
  ];
  const oldPlace = play(oldPath, t);
  const mag = t >= seat ? { pos: ZERO, rot: ZERO, shown: 1 } : { ...oldPlace, shown: t < letGo ? 1 : 0 };

  const newPath: Key<Place>[] = [
    [fetch, FROM_POUCH],
    [magIn - 0.1, { pos: [0, -0.08, -0.006], rot: [0.08, 0, 0] }],
    [magIn, { pos: [0, -0.03, 0], rot: ZERO }, "linear"],
    [pushed, { pos: [0, -0.008, 0], rot: ZERO }, "out"],
    [seat, { pos: ZERO, rot: ZERO }, "in"],
  ];
  const newPlace = play(newPath, t);
  const spare = { ...newPlace, shown: t >= fetch && t < seat ? 1 : 0 };
  const holding = (p: Place) => attach(add(HOME, p.pos), p.rot, ON_MAG);
  const slapMag = (below: number) => attach(add(HOME, [0, below, 0]), ZERO, SLAP);

  // The handle is pulled back hard, flipped up to lock, and later slapped down to run home.
  const handle = empty ? play<number>([[back * 0.45, 0], [back, 1, "out"], [forward - 0.03, 1], [forward, 0, "in"]], t) : 0;
  const handleLock = empty ? play<number>([[back, 0], [back + 0.05, 1], [forward - 0.03, 1], [forward, 0, "in"]], t) : 0;

  const rest = pose.support;
  let support: HandPose;
  if (t < grab) {
    const keys: Key<HandPose>[] = empty
      ? [[0, rest], [back * 0.45, onHandle(0, 0)], [back, onHandle(1, 0), "out"], [back + 0.05, onHandle(1, 1)], [grab, holding(play(oldPath, grab))]]
      : [[0, rest], [grab, holding(play(oldPath, grab))]];
    support = play(keys, t);
  } else if (t < letGo) {
    const thumb = play<number>([[release - 0.04, ON_MAG.thumb], [release, 0], [out, ON_MAG.thumb]], t);
    support = { ...holding(oldPlace), thumb };
  } else if (t < fetch) support = play<HandPose>([[letGo, holding(play(oldPath, letGo))], [fetch, holding(play(newPath, fetch))]], t);
  else if (t < pushed) support = holding(newPlace);
  else {
    const keys: Key<HandPose>[] = [[pushed, holding(play(newPath, pushed))], [seat - 0.05, slapMag(-0.03)], [seat, slapMag(0), "in"], [seat + 0.06, slapMag(-0.02), "out"]];
    if (empty) keys.push([forward - 0.07, slapping(0.035)], [forward, slapping(0), "in"], [forward + 0.06, slapping(-0.012), "out"]);
    keys.push([settle, rest]);
    support = play(keys, t);
  }

  const posed = { ...pose, mag, spare, support, handle, handleLock, carrier: Math.max(pose.carrier, handle), dropped: t >= letGo };
  const lift = envelope(t, Math.min(back, release) + 0.05, settle, input.seconds);
  return liftBody(posed, lift, { roll: 0.6, pitch: 0.12, raise: 0.05 }, input.inward, jolts(t, [[seat, 0.7], [forward, 1]]));
}
