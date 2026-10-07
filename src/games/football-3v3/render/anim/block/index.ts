import { LOOSE } from "../../../engine/block-preset";
import type { AthleteView } from "../../../engine/view";
import { add, keyed, mix, over, type Keys, type Pose } from "../pose";
import { mirror } from "../tackle/body-keys";
import { ANCHOR, BEATEN, BULL, DRIVE, FIGHT_L, FIGHT_R, GIVING, OVER_HIM, PASS_SET, PUNCH, RIP_THROUGH, STAND_OVER, SWIM } from "./keys";

/**
 * The authored line play for a lineman in a block move (picked by the
 * engine, block-preset.ts), on the move's own clock. Locked up, each
 * side holds the shape of the move with choppy feet, busy hands and a
 * lean that follows the pair's shoves (`win`, -1 giving ground to 1
 * driving). A pancake and a shed play out once; after them the man is
 * back on his own legs and this gives way to the stride (null).
 */

/** The blocker throwing his man down, then stood over him until he goes again. */
const PANCAKE: Keys = [
  [0, DRIVE],
  [0.22, over(DRIVE, { fwd: 0.1, pitch: 0.55, shLX: -1.95, shRX: -1.95, elL: 0, elR: 0 })],
  [0.5, OVER_HIM],
  [0.72, OVER_HIM],
  [LOOSE.overHim, STAND_OVER],
];
/** The rusher's swim and rip past the blocker. */
const SHED: Keys = [[0, BULL], [0.16, SWIM], [0.36, RIP_THROUGH]];
/** The blocker spun off it, reaching after him. */
const BEAT: Keys = [[0, PASS_SET], [0.18, BEATEN], [LOOSE.beaten * 0.75, over(BEATEN, { yaw: -0.3, pitch: 0.2 })]];

/** Seconds each one off move plays before the stride takes over. */
const ENDS = { pancake: LOOSE.overHim + 0.25, shed: 0.55, beaten: LOOSE.beaten } as const;

/** The shape each side holds through a locked up move. */
function held(kind: "pass" | "drive" | "anchor", offense: boolean): Pose {
  if (kind === "pass") return offense ? PASS_SET : BULL;
  if (kind === "drive") return offense ? DRIVE : GIVING;
  return offense ? ANCHOR : over(BULL, { pitch: 0.85 });
}

/** Hands never still in a block: short jabs and grabs at the other man's pads. */
function busyHands(p: Pose, time: number, seed: number): Pose {
  const j = Math.sin(time * 6.3 + seed);
  const k = Math.sin(time * 4.1 + seed * 1.7);
  return add({ ...p }, { shLX: j * 0.12, shRX: -k * 0.12, elL: Math.max(0, j) * -0.25, elR: Math.max(0, k) * -0.25 });
}

export function blockMove(a: AthleteView, time: number, seed: number, win: number): Pose | null {
  const b = a.block;
  if (!b || a.action === "down") return null;
  const t = b.t;
  if (b.kind === "pancake") return b.offense && t < ENDS.pancake ? keyed(PANCAKE, t) : null;
  if (b.kind === "shed") {
    // The rusher swims over one shoulder or the other; the blocker spins the same way.
    const left = a.number % 2 === 0;
    const p = b.offense ? (t < ENDS.beaten ? keyed(BEAT, t) : null) : t < ENDS.shed ? keyed(SHED, t) : null;
    return p && (left ? mirror(p) : p);
  }
  if (!a.blocked) return null;
  let p: Pose;
  if (b.kind === "engage") {
    // The punch off the snap, then the hands fight for the inside.
    const fight = mix(FIGHT_L, FIGHT_R, 0.5 + 0.5 * Math.sin(time * 7 + seed));
    p = keyed([[0, over(PUNCH, { shLX: -0.6, shRX: -0.6, elL: -1.2, elR: -1.2 })], [0.12, PUNCH], [0.28, fight]], t);
    if (t > 0.28) p = fight;
  } else p = busyHands(held(b.kind, b.offense), time, seed);
  // The pair's shove: the man winning leans in, the man giving it sits up.
  const lean = Math.max(-1, Math.min(1, win)) * 0.18;
  // Short choppy steps under it all, the feet never set.
  const s = Math.sin(time * 9 + seed);
  return add({ ...p }, {
    pitch: lean, spineX: -lean * 0.5,
    hipLX: -s * 0.2, hipRX: s * 0.2, kneeL: Math.max(0, s) * 0.35, kneeR: Math.max(0, -s) * 0.35,
  });
}
