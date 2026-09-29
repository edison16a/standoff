"use client";
import { lazy, Suspense, type CSSProperties } from "react";
import { Icon } from "@/components/ui/Icon";
import { VictoryOverlay } from "@/games/kit/victory/ui/VictoryOverlay";
import type { TeamId } from "../../engine/fighter";
import { GUNS } from "../../engine/guns";
import { CHARACTERS } from "../../roster";
import { TEAMS } from "../../teams";
import { GunIcon } from "../../ui/GunIcon";
import { useCounterStore, type ResultRow } from "../host-store";
import { useSession } from "./session-context";

// The winners' 3D scene loads with the results, not with the match.
const TeamCanvas = lazy(() => import("./results/TeamCanvas"));

function Row({ r }: { r: ResultRow }) {
  return (
    <tr style={{ "--player": r.colour, "--team": TEAMS[r.team].color } as CSSProperties}>
      <th scope="row">
        <span className="cb-rank__who">
          <span className="cb-rank__name">{r.name}</span>
          <small>{r.bot ? `Computer, ${CHARACTERS[r.character].name}` : CHARACTERS[r.character].name}</small>
        </span>
      </th>
      <td>
        <span className="cb-rank__gun" title={GUNS[r.gun].name}>
          <GunIcon gun={r.gun} size={40} />
        </span>
      </td>
      <td>{r.kills}</td>
      <td>{r.deaths}</td>
      <td>{r.headshots}</td>
      <td>{r.damage}</td>
    </tr>
  );
}

/**
 * The winners' scene: the winning team together on a stage spattered
 * with paint, the top scorer lifting the cup, their names big across the
 * top. Once the names have landed, every fighter's kills, deaths, head
 * shots and damage come up in the bottom right corner, winners first.
 * Play again keeps the teams and guns; Menu goes back to the lobby.
 */
export function Results() {
  const session = useSession();
  const results = useCounterStore((s) => s.results);
  const winner = useCounterStore((s) => s.winner);
  const score = useCounterStore((s) => s.score);
  const canStart = useCounterStore((s) => s.canStart);
  const team: TeamId = winner ?? 0;
  const other: TeamId = team === 0 ? 1 : 0;
  // Top scorer first: they lift the cup, on the left, and their name leads.
  const winners = results.filter((r) => r.team === team).sort((a, b) => b.kills - a.kills || b.damage - a.damage);
  const sorted = [...results].sort((a, b) => (a.team === team ? 0 : 1) - (b.team === team ? 0 : 1) || b.kills - a.kills);
  return (
    <div className="cb-results" style={{ "--team": TEAMS[team].color } as CSSProperties}>
      {winners.length > 0 && (
        <Suspense fallback={null}>
          <TeamCanvas team={team} winners={winners.map((w) => ({ character: w.character, gun: w.gun, colour: w.colour }))} />
        </Suspense>
      )}
      <VictoryOverlay
        eyebrow={winners.length > 1 ? `${TEAMS[team].name} team wins` : "Winner"}
        names={winners.map((w) => ({ name: w.name, colour: w.colour }))}
        subtitle={`${TEAMS[team].name} team, ${score[team]} rounds to ${score[other]}`}
      />
      {/* In the bottom right corner, so the winners have the middle and the room's QR code keeps the bottom left. */}
      <div className="cb-results__panel">
        <table className="cb-rank">
          <thead>
            <tr>
              <th scope="col">Fighter</th>
              <th scope="col">Gun</th>
              <th scope="col">Kills</th>
              <th scope="col">Deaths</th>
              <th scope="col">Heads</th>
              <th scope="col">Damage</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <Row key={r.id} r={r} />
            ))}
          </tbody>
        </table>
        <div className="cb-results__actions">
          <button type="button" className="btn btn--lg" onClick={() => session.backToLobby()}>
            <Icon name="users" />
            Menu
          </button>
          <button type="button" className="btn btn--primary btn--lg" disabled={!canStart} onClick={() => session.start()}>
            <Icon name="refresh" />
            Play again
          </button>
        </div>
      </div>
    </div>
  );
}
