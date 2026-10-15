"use client";
import { RUNNER_COLOURS } from "../../engine/playbook/colours";
import type { Book, CardRunner, PlayCardView } from "../../protocol";

/** The card's drawing space: the field's width across, as many yards up as the card shows. */
const W = 160;
const H = 90;

const px = ([u, v]: [number, number]): [number, number] => [u * W, (1 - v) * H];

/** The arrow head, the settle dot or the block bar at the end of a runner's line. */
function EndMark({ runner, colour }: { runner: CardRunner; colour: string }) {
  const pts = runner.path.map(px);
  const tip = pts[pts.length - 1];
  const from = pts[pts.length - 2];
  if (!tip || !from) return null;
  const a = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
  const at = (d: number, turn: number): [number, number] => [tip[0] + Math.cos(a + turn) * d, tip[1] + Math.sin(a + turn) * d];
  if (runner.end === "stop") return <circle cx={tip[0]} cy={tip[1]} r={2.6} fill={colour} />;
  if (runner.end === "block") {
    // A blocker's line ends in a bar across it, as on a coach's card.
    const [l, r] = [at(4, Math.PI / 2), at(4, -Math.PI / 2)];
    return <line x1={l[0]} y1={l[1]} x2={r[0]} y2={r[1]} stroke={colour} strokeWidth={2.4} strokeLinecap="round" />;
  }
  return <polygon points={[at(0.5, 0), at(6, Math.PI * 0.84), at(6, -Math.PI * 0.84)].map((p) => p.join(",")).join(" ")} fill={colour} />;
}

/** One runner: his line in his colour, dashed when a person runs him, and his number where he lines up. */
function RunnerLine({ runner }: { runner: CardRunner }) {
  const colour = RUNNER_COLOURS[runner.n - 1] ?? "#ffffff";
  const pts = runner.path.map(px);
  const start = pts[0];
  if (!start) return null;
  return (
    <g>
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={colour} strokeWidth={runner.carry ? 3.4 : 2.4} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={runner.free ? "4 3" : undefined} />
      <EndMark runner={runner} colour={colour} />
      <circle cx={start[0]} cy={start[1]} r={5.2} fill={colour} stroke="#0b1a10" strokeWidth={1.2} />
      <text x={start[0]} y={start[1] + 2.6} textAnchor="middle" fontSize={7.5} fontWeight={900} fill="#0b1a10">
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
