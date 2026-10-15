import type { TackleKind } from "./tackle-preset";

/**
 * The timing and placement of each tackle preset. The engine moves the
 * bodies by these numbers and the drawing poses them by the same clock,
 * so two men in a tackle stay locked together instead of drifting apart
 * or sinking into each other. Every place is the tackler's hips from the
 * carrier's, in metres along the tackle's line (`along`, ahead positive)
 * and across it toward the side the tackler came from (`across`).
 */
export interface Hold {
  t: number;
  along: number;
  across: number;
}

/** A stretch of the carrier's slide: until `until` seconds he loses `decel` m/s² and is driven on by `push`. */
export interface Slide {
  until: number;
  decel: number;
  push: number;
}

export interface TackleMove {
  /** Seconds each man spends down, the last TACKLE.getUp of it getting up. */
  carrierDown: number;
  tacklerDown: number;
  /** The pile: a second defender falling on top. */
  pileDown: number;
  /** Seconds the tackler is held to the carrier: through his get up, stepping clear of him, or only through the contact for a dive that lets go. */
  release: number;
  /** Where the tackler is held through the move, after easing in from where he hit. */
  hold: readonly Hold[];
  /** Where a man piling on is held, toward his own side. */
  pile: readonly Hold[];
  slide: readonly Slide[];
  /** Which way each man faces against the tackle's line: 0 along it, PI back down it, PI/2 to the tackler's side. */
  carrierYaw: number;
  tacklerYaw: number;
}

const STOP = { until: Infinity, decel: 9, push: 0 };

export const TACKLE_MOVES: Record<TackleKind, TackleMove> = {
  // From the side or behind: arms round the waist, both go over and roll together, the tackler over the top.
  wrap: {
    carrierDown: 2.0, tacklerDown: 1.8, pileDown: 0, release: 1.8,
    hold: [
      { t: 0.16, along: -0.25, across: 0.42 }, { t: 0.45, along: -0.3, across: 0.4 }, { t: 0.75, along: -0.3, across: 0 },
      { t: 1.0, along: -0.25, across: -0.45 }, { t: 1.2, along: -0.25, across: -0.45 }, { t: 1.7, along: -0.3, across: -0.85 },
    ],
    pile: [],
    slide: [{ until: 0.4, decel: 8, push: 0 }, STOP],
    carrierYaw: 0, tacklerYaw: 0,
  },
  // Head on: chest to chest, the legs keep churning and walk the carrier back two strides before he goes over onto his back.
  drive: {
    carrierDown: 2.15, tacklerDown: 1.9, pileDown: 0, release: 1.9,
    hold: [{ t: 0.12, along: -0.62, across: 0 }, { t: 0.7, along: -0.6, across: 0 }, { t: 1.0, along: -0.55, across: 0 }, { t: 1.3, along: -0.55, across: 0 }, { t: 1.8, along: -1.05, across: 0 }],
    pile: [],
    slide: [{ until: 0.12, decel: 0, push: 0 }, { until: 0.75, decel: 2, push: 4.5 }, { until: Infinity, decel: 10, push: 0 }],
    carrierYaw: Math.PI, tacklerYaw: 0,
  },
  // Full power, shoulder first: the carrier is blown off his feet and thrown back, the hitter lands on him and gets up over him.
  slam: {
    carrierDown: 2.15, tacklerDown: 1.5, pileDown: 0, release: 0.95,
    hold: [{ t: 0.08, along: -0.7, across: 0 }, { t: 0.4, along: -0.8, across: 0 }, { t: 0.6, along: -0.45, across: 0.05 }, { t: 0.95, along: -0.5, across: 0.1 }],
    pile: [],
    slide: [{ until: 0.06, decel: 0, push: 0 }, { until: 0.36, decel: 0, push: 7 }, { until: 0.6, decel: 5, push: 0 }, { until: Infinity, decel: 10, push: 0 }],
    carrierYaw: Math.PI, tacklerYaw: 0,
  },
  // Low at the shins from the side: the feet stop, the body topples forward, the tackler hugging the ankles.
  ankle: {
    carrierDown: 1.8, tacklerDown: 1.7, pileDown: 0, release: 1.7,
    hold: [{ t: 0.1, along: -0.05, across: 1.0 }, { t: 0.45, along: -0.95, across: 1.0 }, { t: 1.1, along: -0.95, across: 1.0 }, { t: 1.6, along: -1.0, across: 1.2 }],
    pile: [],
    slide: [{ until: 0.45, decel: 5, push: 0 }, STOP],
    carrierYaw: 0, tacklerYaw: -Math.PI / 2,
  },
  // A flat dive from behind clips a heel: the carrier stumbles on a few steps and pitches forward.
  shoestring: {
    carrierDown: 1.9, tacklerDown: 1.6, pileDown: 0, release: 0.12,
    hold: [{ t: 0.12, along: -1.45, across: 0.1 }],
    pile: [],
    slide: [{ until: 0.5, decel: 6, push: 0 }, { until: Infinity, decel: 12, push: 0 }],
    carrierYaw: 0, tacklerYaw: 0,
  },
  // One man stands him up, the next one buries him: all of them go down in a heap.
  gang: {
    carrierDown: 2.1, tacklerDown: 1.9, pileDown: 1.7, release: 1.9,
    hold: [{ t: 0.15, along: -0.2, across: 0.45 }, { t: 0.7, along: -0.25, across: 0.4 }, { t: 1.3, along: -0.25, across: 0.4 }, { t: 1.8, along: -0.3, across: 0.8 }],
    pile: [{ t: 0.3, along: 0.1, across: 0.55 }, { t: 0.7, along: 0.05, across: 0.2 }, { t: 1.1, along: 0.05, across: 0.2 }, { t: 1.6, along: 0.1, across: 0.75 }],
    slide: [{ until: 0.35, decel: 14, push: 0 }, STOP],
    carrierYaw: 0, tacklerYaw: 0,
  },
  // A sack in a bear hug: the rusher wraps the QB, swings him round off his feet and throws him down on his side, landing on him.
  spin: {
    carrierDown: 2.1, tacklerDown: 1.9, pileDown: 0, release: 1.9,
    hold: [{ t: 0.12, along: 0, across: 0.55 }, { t: 0.4, along: 0.35, across: 0.45 }, { t: 0.7, along: 0.5, across: 0.12 }, { t: 1.0, along: 0.45, across: 0.08 }, { t: 1.8, along: 0.6, across: 0.6 }],
    pile: [],
    slide: [{ until: 0.3, decel: 10, push: 0 }, STOP],
    carrierYaw: 0, tacklerYaw: -Math.PI / 2,
  },
  // A sack from behind: hit in the back as he looks downfield, whiplashed and driven face first into the turf with the rusher on top.
  blindside: {
    carrierDown: 2.1, tacklerDown: 1.8, pileDown: 0, release: 1.5,
    hold: [{ t: 0.1, along: -0.55, across: 0.12 }, { t: 0.4, along: -0.25, across: 0.08 }, { t: 0.65, along: -0.12, across: 0.05 }, { t: 1.5, along: -0.15, across: 0.05 }],
    pile: [],
    slide: [{ until: 0.35, decel: 7, push: 0 }, { until: Infinity, decel: 12, push: 0 }],
    carrierYaw: 0, tacklerYaw: 0,
  },
};
