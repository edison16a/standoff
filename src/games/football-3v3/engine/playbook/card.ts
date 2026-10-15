import { FIELD, YARD, yardToX } from "../field";
import { formationSpot } from "../formation";
import type { Match } from "../match";
import type { Athlete } from "../types";
import type { V2 } from "../vec";
import { CARRY_WORDS, carryPoints } from "./carry";
import type { PlayDesign } from "./deal";
import type { Huddle } from "./huddle";
import { outOf, playRoutePoints, ROUTE_WORDS, SETTLES } from "./shapes";

/**
 * A play drawn for the phone's card, in the card's own units: `u` runs
 * across the whole field as the QB looks downfield, 0 his left sideline
 * to 1 his right, and `v` runs from CARD.behind yards behind the line
 * (0) to CARD.ahead yards past it (1). A route that leaves the card is
 * cut at its edge, where its arrow head goes.
 */
export const CARD = { behind: 8, ahead: 22 } as const;

export interface CardRunner {
  /** His number on the card and the field, 1 to 4, which also picks his colour. */
  n: number;
  path: [number, number][];
  /** How the line ends: running on, settling, or a block. */
  end: "arrow" | "stop" | "block";
  word: string;
  /** A person's runner: the card is only a suggestion, he goes where he likes. */
  free: boolean;
  /** The back taking the pitch on a run call. */
  carry: boolean;
}

export interface PlayCard {
  name: string;
  runners: CardRunner[];
}

/** The line of scrimmage and the QB on every card, in card units. */
export interface CardFrame {
  los: number;
  qb: [number, number];
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Field point to card point for the offense now. */
function toCard(m: Match, p: V2): [number, number] {
  // Facing +x the QB has -z on his left, facing -x +z: so across is z times the way he faces.
  const u = (p.z * m.sign + FIELD.halfWidth) / (2 * FIELD.halfWidth);
  const down = ((p.x - yardToX(m.offense, m.drive.los)) * m.sign) / YARD;
  return [round(u), round((down + CARD.behind) / (CARD.behind + CARD.ahead))];
}

/**
 * Cuts a path where it first leaves the card, so a deep route ends with
 * its arrow at the top edge instead of running off the picture. Pure.
 */
export function clipToCard(path: readonly [number, number][]): { path: [number, number][]; cut: boolean } {
  const out: [number, number][] = [];
  const inside = ([u, v]: [number, number]) => u >= 0 && u <= 1 && v >= 0 && v <= 1;
  for (let i = 0; i < path.length; i++) {
    const p = path[i]!;
    if (inside(p)) {
      out.push(p);
      continue;
    }
    const prev = out[out.length - 1];
    if (!prev) return { path: out, cut: true };
    // Walk back along the leg to the edge it crossed.
    let k = 1;
    for (const [a, b, edge] of [[prev[0], p[0], 0], [prev[0], p[0], 1], [prev[1], p[1], 0], [prev[1], p[1], 1]] as const) {
      if ((b - edge) * (a - edge) < 0) k = Math.min(k, (edge - a) / (b - a));
    }
    out.push([round(prev[0] + (p[0] - prev[0]) * k), round(prev[1] + (p[1] - prev[1]) * k)]);
    return { path: out, cut: true };
  }
  return { path: out, cut: false };
}

/** One runner's line on a card, from where he lines up for the call. */
function runnerLine(m: Match, h: Huddle, design: PlayDesign, a: Athlete, i: number, qb: V2): CardRunner {
  const at = formationSpot(a, m.drive, h.call, h.back);
  const carry = a.id === h.back && design.carry !== null;
  const kind = design.routes[i] ?? "block";
  const points = carry ? carryPoints(design.carry!, at, qb.z, m.sign) : playRoutePoints(kind, at, m.sign, outOf(at.z, m.drive.ballZ));
  const { path, cut } = clipToCard([at, ...points].map((p) => toCard(m, p)));
  const end = carry || cut || !SETTLES.has(kind) ? "arrow" : kind === "block" ? "block" : "stop";
  const word = carry ? CARRY_WORDS[design.carry!] : ROUTE_WORDS[kind];
  return { n: i + 1, path, end, word, free: a.seat !== null && !a.auto, carry };
}

/** The page of plays as the phone draws it, and the frame every card shares. */
export function pageCards(m: Match, h: Huddle): { frame: CardFrame; cards: PlayCard[] } {
  const qbSpot = formationSpot(m.qbOf(m.offense), m.drive, h.call, h.back);
  const runners = h.runners.map((id) => m.athletes[id]!);
  const cards = h.plays.map((design) => ({ name: design.name, runners: runners.map((a, i) => runnerLine(m, h, design, a, i, qbSpot)) }));
  return { frame: { los: round(CARD.behind / (CARD.behind + CARD.ahead)), qb: toCard(m, qbSpot) }, cards };
}
