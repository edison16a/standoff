"use client";
import { playerColor } from "@/games/kit/players";
import { leaders, mvp, type Category, type StatLine } from "../../engine/stats";
import type { HudSeat } from "../host-store";

const COLUMNS: { key: Category | "headshots" | "bestStreak"; label: string; show: (l: StatLine) => string }[] = [
  { key: "kills", label: "Kills", show: (l) => String(l.kills) },
  { key: "accuracy", label: "Accuracy", show: (l) => `${Math.round(l.accuracy * 100)}%` },
  { key: "headshots", label: "Head shots", show: (l) => String(l.headshots) },
  { key: "weakHits", label: "Weak points", show: (l) => String(l.weakHits) },
  { key: "damage", label: "Damage", show: (l) => String(Math.round(l.damage * 10)) },
  { key: "bestStreak", label: "Best streak", show: (l) => String(l.bestStreak) },
];

/**
 * The team's numbers, one row per player, with the leader of each
 * column lit in gold and the most valuable player named on top.
 */
export function StatsTable({ lines, seats }: { lines: readonly StatLine[]; seats: readonly HudSeat[] }) {
  const best = leaders(lines);
  const top = mvp(lines);
  const name = (seat: number) => seats.find((s) => s.seat === seat)?.name ?? `Player ${seat}`;
  return (
    <div className="zs-stats-table">
      {top !== null && lines.length > 1 && (
        <p className="zs-mvp">
          Top gun: <strong style={{ color: playerColor(top) }}>{name(top)}</strong>
        </p>
      )}
      <table>
        <thead>
          <tr>
            <th>Player</th>
            {COLUMNS.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.seat}>
              <td>
                <span className="zs-dot" style={{ background: playerColor(line.seat) }} />
                {name(line.seat)}
              </td>
              {COLUMNS.map((c) => (
                <td key={c.key} className={c.key !== "headshots" && c.key !== "bestStreak" && best[c.key] === line.seat ? "zs-lead" : ""}>
                  {c.show(line)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
