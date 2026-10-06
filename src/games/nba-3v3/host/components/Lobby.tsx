"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { DifficultyPicker } from "@/games/kit/difficulty/DifficultyPicker";
import { playerColor } from "@/games/kit/players";
import type { TeamId } from "../../engine/types";
import { BUILDS } from "../../builds";
import { TEAMS } from "../../roster";
import { JerseyBadge } from "../../ui/JerseyBadge";
import { useNbaStore, type SpotView } from "../host-store";
import { ROLE_NAMES } from "../roles";
import { BotsToggle, matchSize } from "./BotsToggle";
import { SizePicker } from "./SizePicker";
import { useSession } from "./session-context";

/** The role on a card. The host clicks a player's role to hand them the next one. */
function RoleTag({ spot, onRole }: { spot: SpotView; onRole?(seat: number): void }) {
  const name = ROLE_NAMES[spot.role];
  if (!onRole || spot.seat === null) return <span className="nba-role nba-role--fixed">{name}</span>;
  const seat = spot.seat;
  return (
    <button type="button" className="nba-role" aria-label={`${spot.name} plays ${name}. Change role`} onClick={() => onRole(seat)}>
      {name}
    </button>
  );
}

function SpotCard({ spot, onMove, onRole }: { spot: SpotView; onMove(seat: number): void; onRole(seat: number): void }) {
  const c = BUILDS[spot.build];
  const human = spot.seat !== null;
  const style = human ? ({ "--player": playerColor(spot.seat!) } as React.CSSProperties) : undefined;
  const body = (
    <>
      <JerseyBadge build={spot.build} team={spot.team} size={52} />
      <span className="nba-spot__text">
        <strong className="nba-spot__name">{spot.name}</strong>
        <span className="nba-spot__star">{human ? c.name : "Computer"}</span>
      </span>
      {human && (
        <svg className="nba-spot__move" viewBox="0 0 24 24" aria-hidden="true" style={{ transform: spot.team === 0 ? undefined : "scaleX(-1)" }}>
          <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </>
  );
  if (!human)
    return (
      <li className="nba-spot nba-spot--bot">
        {body}
        <RoleTag spot={spot} />
      </li>
    );
  return (
    <li className="nba-spot nba-spot--human" style={style}>
      <RoleTag spot={spot} onRole={onRole} />
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

interface ColumnProps {
  team: TeamId;
  spots: SpotView[];
  onDrop(seat: number, team: TeamId): void;
  onMove(seat: number): void;
  onRole(seat: number): void;
}

function TeamColumn({ team, spots, onDrop, onMove, onRole }: ColumnProps) {
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
          <SpotCard key={spot.seat ?? `bot-${i}`} spot={spot} onMove={onMove} onRole={onRole} />
        ))}
        {spots.length === 0 && <li className="nba-spot nba-spot--empty">Move a player here</li>}
      </ul>
    </section>
  );
}

/** Players sitting out because both teams are full. Clicking one puts them in, and the newest on that team sits out instead. */
function Bench({ bench, onPick }: { bench: { seat: number; name: string }[]; onPick(seat: number): void }) {
  return (
    <div className="nba-bench" role="group" aria-label="Sitting out">
      <span className="nba-bench__label">Sitting out</span>
      {bench.map((b) => (
        <button key={b.seat} type="button" className="nba-bench__player" style={{ "--player": playerColor(b.seat) } as React.CSSProperties} onClick={() => onPick(b.seat)}>
          {b.name}
        </button>
      ))}
    </div>
  );
}

/**
 * The lobby on the big screen: two team columns with everyone who is
 * ready, and computer players in the empty spots unless they are turned
 * off. Click a player to send them to the other side or drag them
 * across, click a role to hand out Guard, Wing and Big, pick how good
 * the computer is, then start.
 */
export function Lobby() {
  const session = useSession();
  const spots = useNbaStore((state) => state.spots);
  const seats = useNbaStore((state) => state.seats);
  const bots = useNbaStore((state) => state.bots);
  const level = useNbaStore((state) => state.level);
  const size = useNbaStore((state) => state.size);
  const bench = useNbaStore((state) => state.bench);
  const block = useNbaStore((state) => state.startBlock);
  const choosing = seats.filter((s) => s.connected && !s.ready);
  const humans = spots.filter((s) => s.seat !== null).length;
  const home = spots.filter((s) => s.team === 0);
  const away = spots.filter((s) => s.team === 1);
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
        <p>{matchSize(bots, size, home.length, away.length)} Pick your build on your phone.</p>
      </header>
      <div className="nba-lobby__teams">
        <TeamColumn team={0} spots={home} onDrop={(seat, team) => session.setTeam(seat, team)} onMove={move} onRole={(seat) => session.cycleRole(seat)} />
        <span className="nba-lobby__vs">VS</span>
        <TeamColumn team={1} spots={away} onDrop={(seat, team) => session.setTeam(seat, team)} onMove={move} onRole={(seat) => session.cycleRole(seat)} />
      </div>
      {bench.length > 0 && <Bench bench={bench} onPick={(seat) => session.setTeam(seat, home.length <= away.length ? 0 : 1)} />}
      <div className="nba-lobby__options">
        <SizePicker size={size} onChange={(next) => session.setSize(next)} />
        <BotsToggle on={bots} onChange={(on) => session.setBots(on)} />
        {bots && <DifficultyPicker level={level} onChange={(next) => session.setLevel(next)} />}
      </div>
      <footer className="nba-lobby__footer">
        <p className="nba-lobby__note">
          {choosing.length > 0
            ? `Still choosing: ${choosing.map((s) => s.name).join(", ")}.`
            : humans === 0
              ? "Scan the code to join. Up to six players."
              : block === "oneSided"
                ? "With computer players off, each team needs a player."
                : "Click a player to switch sides. Click a role to change it."}
        </p>
        <button type="button" className="btn btn--lg nba-lobby__shuffle" disabled={humans < 2} onClick={() => session.shuffle()}>
          <Icon name="refresh" />
          Shuffle teams
        </button>
        <button type="button" className="btn btn--primary btn--lg nba-lobby__start" disabled={block !== null} onClick={() => session.start()}>
          <Icon name="play" />
          Start game
        </button>
      </footer>
    </div>
  );
}
