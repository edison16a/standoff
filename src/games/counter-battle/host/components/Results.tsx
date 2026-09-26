"use client";
import type { CSSProperties } from "react";
import { Icon } from "@/components/ui/Icon";
import type { TeamId } from "../../engine/fighter";
import { GUNS } from "../../engine/guns";
import { CHARACTERS } from "../../roster";
import { TEAMS } from "../../teams";
import { GunIcon } from "../../ui/GunIcon";
import { useCounterStore, type ResultRow } from "../host-store";
import { useSession } from "./session-context";

/** Paint confetti falling over the card in the winners' colour and the field's lime. Fixed positions, so it never jumps between renders. */
function Confetti({ colours }: { colours: string[] }) {
  return (
    <div className="cb-confetti" aria-hidden="true">
      {Array.from({ length: 42 }, (_, i) => (
        <span
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: colours[i % colours.length],
            animationDelay: `${(i % 9) * 0.21}s`,
            animationDuration: `${2.5 + (i % 5) * 0.35}s`,
          }}
        />
      ))}
    </div>
  );
}

function Row({ r }: { r: ResultRow }) {
  return (
    <tr style={{ "--player": r.colour, "--team": TEAMS[r.team].color } as CSSProperties}>
      <th scope="row">
        <span className="cb-rank__name">{r.name}</span>
        <small>{r.bot ? `Computer, ${CHARACTERS[r.character].name}` : CHARACTERS[r.character].name}</small>
      </th>
      <td className="cb-rank__gun">
        <GunIcon gun={r.gun} size={52} />
        <small>{GUNS[r.gun].name}</small>
      </td>
      <td>{r.kills}</td>
      <td>{r.deaths}</td>
      <td>{r.headshots}</td>
      <td>{r.damage}</td>
    </tr>
  );
}

/**
 * The results: the winning side with confetti in its colour, then every
 * fighter team by team with kills, deaths, head shots and damage. Play
 * again keeps the teams and guns; Menu goes back to the lobby.
 */
export function Results() {
  const session = useSession();
  const results = useCounterStore((s) => s.results);
  const winner = useCounterStore((s) => s.winner);
  const score = useCounterStore((s) => s.score);
  const canStart = useCounterStore((s) => s.canStart);
  const team: TeamId = winner ?? 0;
  const winners = results.filter((r) => r.team === team);
  const title = winners.length === 1 ? `${winners[0]!.name} wins` : `${TEAMS[team].name} team wins`;
  const sorted = [...results].sort((a, b) => (a.team === team ? 0 : 1) - (b.team === team ? 0 : 1) || b.kills - a.kills);
  return (
    <div className="cb-results" style={{ "--team": TEAMS[team].color } as CSSProperties}>
      <Confetti colours={[TEAMS[team].color, "#b8f400", "#ffffff", ...winners.map((w) => w.colour)]} />
      <div className="cb-results__card">
        <header className="cb-results__head">
          <span className="cb-results__eyebrow">Match over</span>
          <h2>{title}</h2>
          <p className="cb-results__score">
            <span style={{ color: TEAMS[0].color }}>{score[0]}</span>
            <span aria-hidden="true">:</span>
            <span style={{ color: TEAMS[1].color }}>{score[1]}</span>
          </p>
        </header>
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
