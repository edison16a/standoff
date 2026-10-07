import type { Stage } from "./lab-stage";

/**
 * The lab's staged moments, one per preset. The carrier starts 5.5 m
 * down the field running up +z; each man's spot is from that start, so
 * the contact lands near the middle of the picture. +x is away from
 * the lab camera, which looks along it.
 */
export const STAGES = {
  // Tackles: a lunge picked as each approach, brought down in that preset.
  wrap: { carrier: "routerunner", speed: 7, outcome: "wrap", length: 3.4, cast: [{ build: "lockdown", at: { x: 2.2, z: 4.6 }, vel: { x: -3, z: -1 }, lunge: { at: 0.5, approach: "wrap" } }] },
  drive: { carrier: "routerunner", speed: 6, outcome: "drive", length: 3.4, cast: [{ build: "powerback", at: { x: 0.2, z: 6.4 }, vel: { x: 0, z: -4 }, lunge: { at: 0.45, approach: "drive" } }] },
  ankle: { carrier: "powerback", speed: 6.5, outcome: "ankle", length: 3.2, cast: [{ build: "speedster", at: { x: 2, z: 4.8 }, vel: { x: -3, z: -1 }, lunge: { at: 0.5, approach: "ankle" } }] },
  shoestring: { carrier: "routerunner", speed: 7, outcome: "shoestring", length: 3.4, cast: [{ build: "lockdown", at: { x: 0.35, z: -1.0 }, vel: { x: 0, z: 7.4 }, move: { x: 0, z: 1 }, lunge: { at: 0.5, approach: "shoestring" } }] },
  gang: {
    carrier: "powerback", speed: 6, outcome: "gang", length: 3.6,
    cast: [
      { build: "lockdown", at: { x: 2, z: 4.6 }, vel: { x: -3, z: -1 }, lunge: { at: 0.5, approach: "wrap" } },
      { build: "speedster", at: { x: -1.0, z: 5.0 }, vel: { x: 0, z: 0 } },
    ],
  },
  // The icon's key art: two defenders leaving their feet at a carrier from both sides at once.
  keyart: {
    carrier: "powerback", speed: 7, outcome: "gang", length: 3.4,
    cast: [
      { build: "lockdown", at: { x: 2.3, z: 5.4 }, vel: { x: -2.5, z: -2 }, lunge: { at: 0.5, approach: "wrap" } },
      { build: "speedster", at: { x: -2.4, z: 5.0 }, vel: { x: 2.5, z: -1.5 }, lunge: { at: 0.52, approach: "shoestring" } },
    ],
  },
  // Misses: lunging at nothing, dodged by a juke, and bounced off a carrier who runs through it.
  whiff: { carrier: "routerunner", speed: 7, outcome: "whiff", length: 2.8, cast: [{ build: "lockdown", at: { x: 2.4, z: 3.4 }, vel: { x: -2, z: 0 }, lunge: { at: 0.45, approach: "wrap", aim: { x: -0.8, z: -0.6 } } }] },
  missed: {
    carrier: "routerunner", speed: 7, outcome: "missed", length: 3.2,
    sticks: [{ at: 0.42, move: { x: -1, z: 0.3 }, juke: true }, { at: 0.9, move: { x: 0, z: 1 } }],
    cast: [{ build: "lockdown", at: { x: 1.4, z: 6.2 }, vel: { x: -1, z: -3 }, lunge: { at: 0.45, approach: "wrap" } }],
  },
  shed: { carrier: "powerback", speed: 7.5, outcome: "shed", length: 3, cast: [{ build: "speedster", at: { x: 1.6, z: 3.6 }, vel: { x: -2, z: 2 }, lunge: { at: 0.45, approach: "wrap" } }] },
  // A juke beating the big men in front of it.
  juked: {
    carrier: "routerunner", speed: 6.5, outcome: "none", length: 3,
    sticks: [{ at: 0.8, move: { x: -1, z: 0.2 }, juke: true }, { at: 1.2, move: { x: 0, z: 1 } }],
    cast: [{ build: "lineman", at: { x: 0.2, z: 6.5 } }],
  },
  stumble: {
    carrier: "routerunner", speed: 6.5, outcome: "none", length: 3,
    sticks: [{ at: 0.68, move: { x: -1, z: 0.2 }, juke: true }, { at: 1.1, move: { x: 0, z: 1 } }],
    cast: [{ build: "powerback", at: { x: 0.3, z: 6.4 } }],
  },
  // Running with weight: a plant and cut at speed, and a lineman next to a speedster pulling up.
  cut: { carrier: "speedster", speed: 8, outcome: "none", length: 2.6, sticks: [{ at: 0.65, move: { x: 1, z: 0.1 } }], cast: [] },
  heavy: {
    carrier: "lineman", speed: 5, outcome: "none", length: 3.2, sticks: [{ at: 1.3, move: { x: 0, z: 0 } }],
    cast: [{ build: "speedster", at: { x: 1.5, z: 0 }, vel: { x: 0, z: 8 }, move: { x: 0, z: 1 } }],
  },
} satisfies Record<string, Stage>;

export type StageMove = keyof typeof STAGES;
export const STAGE_MOVES = Object.keys(STAGES) as StageMove[];
