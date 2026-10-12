import { hand } from "../hands/grips";
import { play, type Key } from "../keyframes";
import { add, attach, type GunPose, type HandPose, type V3 } from "../pose";
import { MAG_HOME } from "../rest";
import { at, envelope, FROM_POUCH, holdMag, jolts, liftBody, palmUnder, type ReloadInput } from "./common";

const HOME = MAG_HOME.rifle;
const ZERO: V3 = [0, 0, 0];
const ON_MAG = holdMag([-0.016, -0.065, 0.016]);
/** Under the base plate, which sits low and a little forward on the curved magazine. */
const SLAP = palmUnder([0, -0.192, -0.02], 0.2);
/** The heel of the palm on the bolt catch, low on the left of the receiver. */
const CATCH = hand([-0.027, -0.02, -0.045], [1, 0, 0], [0, 0.6, -0.8], 0.2, 0.15, 0.15);
const CATCH_WIND_UP: HandPose = { ...CATCH, pos: add(CATCH.pos, [-0.04, -0.01, 0.01]) };

type Place = { pos: V3; rot: V3 };

/**
 * The AR's reload. The gun tips to show the well, the thumb presses the
 * release and the empty magazine drops free while the left hand is
 * already on its way to the pouch. The fresh one comes up from below, is
 * pushed in and slapped home. From empty the bolt was held open, so the
 * palm strikes the bolt catch and it runs home; otherwise no bolt work.
 */
export function rifleReload(pose: GunPose, input: ReloadInput): GunPose {
  const { t, empty } = input;
  const release = at(input, "mag-release");
  const out = at(input, "mag-out");
  const magIn = at(input, "mag-in");
  const seat = at(input, "mag-seat");
  const boltCatch = at(input, "bolt-catch");
  const settle = at(input, "settle");
  const fetch = out + (magIn - out) * 0.3;
  const pushed = magIn + (seat - magIn) * 0.45;

  // Freed, the empty magazine slides out under its own weight and is gone at mag-out.
  const drop = play<number>([[release, 0], [out, -0.03, "in"]], t);
  const mag = { pos: (t >= seat ? ZERO : [0, drop, 0]) as V3, rot: ZERO, shown: t < out || t >= seat ? 1 : 0 };

  const path: Key<Place>[] = [
    [fetch, FROM_POUCH],
    [magIn - 0.12, { pos: [0, -0.085, -0.008], rot: [0.12, 0, 0] }],
    [magIn, { pos: [0, -0.035, 0], rot: [0.03, 0, 0] }, "linear"],
    [pushed, { pos: [0, -0.01, 0], rot: ZERO }, "out"],
    [seat - 0.03, { pos: [0, -0.008, 0], rot: ZERO }],
    [seat, { pos: ZERO, rot: ZERO }, "in"],
  ];
  const place = play(path, t);
  const spare = { ...place, shown: t >= fetch && t < seat ? 1 : 0 };
  const holding = (p: Place) => attach(add(HOME, p.pos), p.rot, ON_MAG);
  const slap = (below: number) => attach(add(HOME, [0, below, 0]), ZERO, SLAP);

  const rest = pose.support;
  let support: HandPose;
  if (t < fetch) support = play<HandPose>([[release - 0.04, rest], [fetch, holding(play(path, fetch))]], t);
  else if (t < pushed) support = holding(place);
  else {
    const keys: Key<HandPose>[] = [
      [pushed, holding(play(path, pushed))],
      [seat - 0.06, slap(-0.035)],
      [seat, slap(0), "in"],
      [seat + 0.08, slap(-0.025), "out"],
    ];
    if (empty) keys.push([boltCatch - 0.1, CATCH_WIND_UP], [boltCatch, CATCH, "in"], [boltCatch + 0.07, CATCH_WIND_UP, "out"]);
    keys.push([settle, rest]);
    support = play(keys, t);
  }

  // The right thumb breaks from the grip to press the release on the right side.
  const grip = pose.grip;
  const press: HandPose = { ...grip, pos: add(grip.pos, [0.004, 0.012, -0.012]), thumb: 0 };
  const thumbing = play<HandPose>([[release - 0.1, grip], [release, press, "out"], [release + 0.08, press], [release + 0.22, grip]], t);

  // From empty the carrier was held back and runs home when the catch is struck.
  const held = empty ? play<number>([[boltCatch, 1], [boltCatch + 0.035, 0, "in"]], t) : 0;
  const lifted = { ...pose, mag, spare, support, grip: thumbing, carrier: Math.max(pose.carrier, held), dropped: t >= out };
  const lift = envelope(t, release + 0.04, settle, input.seconds);
  return liftBody(lifted, lift, { roll: 0.5, pitch: 0.12, raise: 0.05 }, input.inward, jolts(t, [[seat, 1], [boltCatch, 0.8]]));
}
