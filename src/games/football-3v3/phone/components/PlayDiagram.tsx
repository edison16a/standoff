"use client";
import { RUNNER_COLOURS } from "../../engine/playbook/colours";
import type { Book, CardRunner, PlayCardView } from "../../protocol";

/**
 * The card's drawing space: the field's 53 yards across and the card's
 * 30 yards up (engine/playbook/card.ts) at one scale, so a cut at forty
 * five degrees on the grass is drawn at forty five degrees.
 */
const W = 200;
const H = 112;
/** One line weight and one head for every runner, so the card reads as one clean diagram. */
const LINE = 2.6;
const HEAD = { length: 7.5, half: 4.2 } as const;
const INK = "#0b1a10";

type Pt = [number, number];

const px = ([u, v]: [number, number]): Pt => [u * W, (1 - v) * H];
const join = (pts: readonly Pt[]) => pts.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");

/**
 * The line to draw for a route ending in an arrow: the same points with
 * the last leg stopped where the head starts, so the head's tip is the
 * route's end and no rounded line end pokes past it. Pure.
 */
export function lineToHead(pts: readonly Pt[]): { line: Pt[]; head: Pt[] } | null {
  const tip = pts[pts.length - 1];
  const from = pts[pts.length - 2];
  if (!tip || !from) return null;
  const len = Math.hypot(tip[0] - from[0], tip[1] - from[1]);
  if (len < 1e-6) return null;
  const d: Pt = [(tip[0] - from[0]) / len, (tip[1] - from[1]) / len];
  const back = Math.min(HEAD.length, len * 0.85);
  const base: Pt = [tip[0] - d[0] * back, tip[1] - d[1] * back];
  const side: Pt = [-d[1] * HEAD.half, d[0] * HEAD.half];
  return { line: [...pts.slice(0, -1), base], head: [[base[0] + side[0], base[1] + side[1]], tip, [base[0] - side[0], base[1] - side[1]]] };
}

/** One runner: a crisp line in his colour with sharp corners and his end mark, and his number where he lines up. */
function RunnerLine({ runner }: { runner: CardRunner }) {
  const colour = RUNNER_COLOURS[runner.n - 1] ?? "#ffffff";
  const pts = runner.path.map(px);
  const start = pts[0];
  if (!start) return null;
  const arrow = runner.end === "arrow" ? lineToHead(pts) : null;
  const line = arrow?.line ?? pts;
  const tip = pts[pts.length - 1]!;
  const from = pts[pts.length - 2] ?? start;
  const a = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
  const bar = (k: number): Pt => [tip[0] + Math.cos(a + (Math.PI / 2) * k) * 4.5, tip[1] + Math.sin(a + (Math.PI / 2) * k) * 4.5];
  return (
    <g>
      <polyline points={join(line)} fill="none" stroke={colour} strokeWidth={LINE} strokeLinejoin="miter" strokeMiterlimit={4} strokeLinecap="butt" />
      {arrow && <polygon points={join(arrow.head)} fill={colour} />}
      {runner.end === "stop" && <rect x={tip[0] - 2.8} y={tip[1] - 2.8} width={5.6} height={5.6} fill={colour} />}
      {/* A blocker's line ends in a bar across it, as on a coach's card. */}
      {runner.end === "block" && <polyline points={join([bar(1), bar(-1)])} stroke={colour} strokeWidth={LINE} strokeLinecap="butt" />}
      {/* A person's runner has a hollow number: the card is only a suggestion for him. */}
      <circle cx={start[0]} cy={start[1]} r={5.4} fill={runner.free ? INK : colour} stroke={runner.free ? colour : INK} strokeWidth={1.4} />
      <text x={start[0]} y={start[1] + 2.7} textAnchor="middle" fontSize={7.5} fontWeight={900} fill={runner.free ? colour : INK}>
        {runner.n}
      </text>
    </g>
  );
}

/**
 * A play's routes on a small field: the line of scrimmage, the QB, and
 * each runner's route from where he lines up, in his own colour with his
 * number, the way the big screen marks him before the snap.
 */
export function PlayDiagram({ book, play }: { book: Book; play: PlayCardView }) {
  const los = (1 - book.los) * H;
  const [qx, qy] = px(book.qb);
  return (
    <svg className="fb-play__field" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <rect x={0} y={0} width={W} height={H} rx={6} fill="#14532d" />
      {[0.25, 0.5, 0.75].map((k) => (
        <line key={k} x1={0} x2={W} y1={los - k * (los + 8)} y2={los - k * (los + 8)} stroke="#ffffff" strokeOpacity={0.12} strokeWidth={0.8} />
      ))}
      <line x1={0} x2={W} y1={los} y2={los} stroke="#7fb2ff" strokeWidth={1.4} />
      <circle cx={qx} cy={qy} r={3.4} fill="#ffffff" />
      {play.runners.map((r) => (
        <RunnerLine key={r.n} runner={r} />
      ))}
    </svg>
  );
}
