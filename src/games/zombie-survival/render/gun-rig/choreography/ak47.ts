import { hand } from "../hands/grips";
import { play, type Key } from "../keyframes";
import { add, attach, type GunPose, type HandPose, type V3 } from "../pose";
import { MAG_HOME, TRAVEL } from "../rest";
import { at, envelope, FROM_POUCH, holdMag, jolts, liftBody, type ReloadInput } from "./common";

const HOME = MAG_HOME.ak47;
const ZERO: V3 = [0, 0, 0];
/** How far the magazine rocks forward on its front lug to come free, in radians. */
const ROCK = 0.45;
/** The banana magazine curves forward, so the hand sits ahead of the lug's line. */
const ON_MAG = holdMag([-0.017, -0.06, 0.042]);
/** The right hand over the top, fingers hooked in front of the charging handle's knob. */
const ON_HANDLE = hand([0.05, 0.024, 0.004], [-0.45, -0.89, 0], [0, 0, -1], 0.85, 0.85, 0.75);

type Place = { pos: V3; rot: V3 };

/**
 * The AK's rock and lock. The left hand takes the magazine, the thumb
 * pushes the paddle, and the magazine rocks forward on its front lug and
 * out, then drops away. The fresh one hooks its front lug into the well
 * and rocks back until it clacks home. From empty the right hand leaves
 * the grip, reaches over and racks the handle on the right: back, then
 * let go so it snaps forward.
 */
export function akReload(pose: GunPose, input: ReloadInput): GunPose {
  const { t, empty } = input;
  const release = at(input, "mag-release");
  const out = at(input, "mag-out");
  const magIn = at(input, "mag-in");
  const seat = at(input, "mag-seat");
  const back = at(input, "bolt-back");
  const forward = at(input, "bolt-forward");
  const settle = at(input, "settle");
  const grab = release - 0.12;
  const letGo = out + 0.1;
  const fetch = letGo + (magIn - letGo) * 0.35;

  const oldPath: Key<Place>[] = [
    [release, { pos: ZERO, rot: ZERO }],
    [out, { pos: ZERO, rot: [ROCK, 0, 0] }],
    [letGo, { pos: [0, -0.035, -0.015], rot: [ROCK + 0.1, 0, 0] }],
  ];
  const oldPlace = play(oldPath, t);
  const mag = t >= seat ? { pos: ZERO, rot: ZERO, shown: 1 } : { ...oldPlace, shown: t < letGo ? 1 : 0 };

  const newPath: Key<Place>[] = [
    [fetch, FROM_POUCH],
    [magIn - 0.14, { pos: [0, -0.03, -0.012], rot: [ROCK + 0.1, 0, 0] }],
    // Hooked on the front lug, still tipped forward...
    [magIn, { pos: ZERO, rot: [ROCK, 0, 0] }],
    // ...then rocked back until it locks.
    [seat, { pos: ZERO, rot: ZERO }, "in"],
  ];
  const newPlace = play(newPath, t);
  const spare = { ...newPlace, shown: t >= fetch && t < seat ? 1 : 0 };
  const holding = (p: Place) => attach(add(HOME, p.pos), p.rot, ON_MAG);

  const rest = pose.support;
  let support: HandPose;
  if (t < grab) support = play<HandPose>([[0, rest], [grab, holding(play(oldPath, grab))]], t);
  else if (t < letGo) {
    // The thumb straightens onto the paddle behind the magazine and pushes it.
    const thumb = play<number>([[release - 0.06, ON_MAG.thumb], [release, 0], [out, ON_MAG.thumb]], t);
    support = { ...holding(oldPlace), thumb };
  } else if (t < fetch) support = play<HandPose>([[letGo, holding(play(oldPath, letGo))], [fetch, holding(play(newPath, fetch))]], t);
  else if (t < seat) support = holding(newPlace);
  else support = play<HandPose>([[seat, holding(play(newPath, seat))], [Math.min(seat + 0.28, settle), rest]], t);

  // From empty, the right hand racks the handle. It travels with the carrier.
  const handle = empty ? play<number>([[back - 0.14, 0], [back, 1, "out"], [forward - 0.03, 1], [forward, 0, "in"]], t) : 0;
  const onHandle = (share: number, open = 0): HandPose => ({
    ...ON_HANDLE,
    pos: add(ON_HANDLE.pos, [open * 0.012, open * 0.006, share * TRAVEL.ak47.handle]),
    curl: ON_HANDLE.curl - open * 0.5,
    index: ON_HANDLE.index - open * 0.5,
  });
  const grip = empty
    ? play<HandPose>([[back - 0.34, pose.grip], [back - 0.14, onHandle(0)], [back, onHandle(1), "out"], [forward - 0.03, onHandle(1)], [forward + 0.05, onHandle(1, 1), "out"], [settle, pose.grip]], t)
    : pose.grip;

  const posed = {
    ...pose,
    mag,
    spare,
    support,
    grip,
    handle: Math.max(pose.handle, handle),
    carrier: Math.max(pose.carrier, handle),
    dropped: t >= letGo,
  };
  const lift = envelope(t, release, settle, input.seconds);
  return liftBody(posed, lift, { roll: 0.55, pitch: 0.11, raise: 0.045 }, input.inward, jolts(t, [[seat, 0.8], [forward, 1]]));
}
