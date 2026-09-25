import type { ActivePunch, Fighter } from "./fighter";
import { RULES } from "./rules";
import { otherHand } from "./types";

/**
 * How much of a punch the defender's gloves are in the way of, 0 to 1,
 * from where their hands are right now. The boxers face each other, so
 * a left hand lands on the defender's right side. A jab or a cross to
 * the head needs the gloves in front of the face, the nearer one most.
 * A hook needs the glove up on that side, though a tight guard in front
 * of the face takes some of it. A body shot needs the elbows down. A
 * boxer in the middle of a punch has a glove out and no block at all.
 */
export function coverOf(punch: ActivePunch, defender: Fighter, now: number): number {
  if (defender.down || defender.punching(now)) return 0;
  const cover = defender.input.cover;
  const near = cover[otherHand(punch.hand)];
  const far = cover[punch.hand];
  let amount: number;
  if (punch.level === "head") {
    amount = punch.style === "hook" ? Math.max(near.side, 0.5 * near.face) : 0.6 * near.face + 0.5 * far.face;
  } else {
    amount = punch.style === "hook" ? near.body : 0.5 * (near.body + far.body);
  }
  // A stunned or rocked boxer's hands are there, but loose.
  if (defender.staggered(now)) amount *= RULES.stunnedCover;
  else if (defender.rocked(now)) amount *= RULES.rockedCover;
  return Math.min(1, Math.max(0, amount));
}
