"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { playerColor } from "@/games/kit/players";
import type { TeamId } from "../../engine/types";
import { CHARACTERS, TEAMS } from "../../roster";
import { JerseyBadge } from "../../ui/JerseyBadge";
import { useNbaStore, type SpotView } from "../host-store";
import { useSession } from "./session-context";

function SpotCard({ spot, onMove }: { spot: SpotView; onMove(seat: number): void }) {
  const c = CHARACTERS[spot.character];
  const human = spot.seat !== null;
  const style = human ? ({ "--player": playerColor(spot.seat!) } as React.CSSProperties) : undefined;
  const body = (
    <>
      <JerseyBadge character={spot.character} team={spot.team} size={52} />
      <span className="nba-spot__text">
        <strong className="nba-spot__name">{human ? spot.name : c.short}</strong>
        <span className="nba-spot__star">{human ? c.name : "Computer player"}</span>
      </span>
      {human && (
        <svg className="nba-spot__move" viewBox="0 0 24 24" aria-hidden="true" style={{ transform: spot.team === 0 ? undefined : "scaleX(-1)" }}>
          <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </>
  );
  if (!human) return <li className="nba-spot nba-spot--bot">{body}</li>;
  return (
    <li className="nba-spot nba-spot--human" style={style}>
      <button
        type="button"
        className="nba-spot__button"
        draggable
        aria-label={`Move ${spot.name} to ${TEAMS[spot.team === 0 ? 1 : 0].name}`}
        onDragStart={(event) => event.dataTransfer.setData("text/plain", String(spot.seat))}
        onClick={() => onMove(spot.seat!)}
      >
        {body}
      </button>
    </li>
  );
}

function TeamColumn({ team, spots, onDrop, onMove }: { team: TeamId; spots: SpotView[]; onDrop(seat: number, team: TeamId): void; onMove(seat: number): void }) {
  const [over, setOver] = useState(false);
  const t = TEAMS[team];
  return (
    <section
      className={`nba-team ${over ? "nba-team--over" : ""}`}
      style={{ "--team": t.color, "--team-dark": t.dark } as React.CSSProperties}
      aria-label={`${t.name} team`}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const seat = Number(event.dataTransfer.getData("text/plain"));
        if (seat) onDrop(seat, team);
      }}
    >
      <h2 className="nba-team__name">{t.name}</h2>
      <ul className="nba-team__spots">
        {spots.map((spot, i) => (
          <SpotCard key={spot.seat ?? `bot-${i}`} spot={spot} onMove={onMove} />
        ))}
      </ul>
    </section>
  );
}

/**
 * The lobby on the big screen: two team columns with everyone who is
 * ready, and computer players in the empty spots. Click a player to send
 * them to the other side or drag them across, then start.
 */
export function Lobby() {
  const session = useSession();
  const spots = useNbaStore((state) => state.spots);
  const seats = useNbaStore((state) => state.seats);
  const choosing = seats.filter((s) => s.connected && !s.ready);
  const humans = spots.filter((s) => s.seat !== null).length;
  const move = (seat: number) => {
    const spot = spots.find((s) => s.seat === seat);
    if (spot) session.setTeam(seat, spot.team === 0 ? 1 : 0);
  };

  return (
    <div className="nba-lobby">
      <header className="nba-lobby__title">
        <span className="nba-lobby__logo">
          <b>Basketball</b> 3v3
        </span>
        <p>Three on three, first to 11. Pick your star on your phone.</p>
      </header>
      <div className="nba-lobby__teams">
        <TeamColumn team={0} spots={spots.filter((s) => s.team === 0)} onDrop={(seat, team) => session.setTeam(seat, team)} onMove={move} />
        <span className="nba-lobby__vs">VS</span>
        <TeamColumn team={1} spots={spots.filter((s) => s.team === 1)} onDrop={(seat, team) => session.setTeam(seat, team)} onMove={move} />
      </div>
      <footer className="nba-lobby__footer">
        <p className="nba-lobby__note">
          {choosing.length > 0
            ? `Still choosing: ${choosing.map((s) => s.name).join(", ")}.`
            : humans === 0
              ? "Scan the code to join. Up to six players."
              : "Click a player to switch sides, or drag them across."}
        </p>
        <button type="button" className="btn btn--lg nba-lobby__shuffle" disabled={humans < 2} onClick={() => session.shuffle()}>
          <Icon name="refresh" />
          Shuffle teams
        </button>
        <button type="button" className="btn btn--primary btn--lg nba-lobby__start" disabled={humans === 0} onClick={() => session.start()}>
          <Icon name="play" />
          Start game
        </button>
      </footer>
    </div>
  );
}
