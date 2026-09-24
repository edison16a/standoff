"use client";
import { Icon } from "@/components/ui/Icon";
import { playerColor } from "@/games/kit/players";
import { ROSTER } from "../../roster";
import { TEAMS, other, type TeamId } from "../../teams";
import { useFifaStore, type SeatView } from "../host-store";
import { TEAM_SIZE } from "../lobby";
import { useSession } from "./session-context";

function PlayerCard({ seat, full }: { seat: SeatView; full: (team: TeamId) => boolean }) {
  const session = useSession();
  const star = seat.pick ? ROSTER[seat.pick] : null;
  const move = (team: TeamId | null) => session.setTeam(seat.seat, team);
  return (
    <li className={`fifa-card ${seat.ready ? "fifa-card--ready" : ""}`} style={{ "--player": playerColor(seat.seat) } as React.CSSProperties}>
      <span className="fifa-card__dot" />
      <span className="fifa-card__who">
        <strong>{seat.name}</strong>
        <span>{star ? `${star.name}, ${star.number}` : "Choosing a star"}</span>
      </span>
      <span className={`fifa-card__state ${seat.ready ? "fifa-card__state--on" : ""}`}>{seat.ready ? "Ready" : "Setting up"}</span>
      <span className="fifa-card__moves">
        {seat.team === null ? (
          ([0, 1] as const).map((team) => (
            <button key={team} type="button" className="fifa-move" style={{ "--team": TEAMS[team].color } as React.CSSProperties} disabled={full(team)} onClick={() => move(team)}>
              {TEAMS[team].name}
            </button>
          ))
        ) : (
          <>
            <button
              type="button"
              className="fifa-move"
              style={{ "--team": TEAMS[other(seat.team)].color } as React.CSSProperties}
              disabled={full(other(seat.team))}
              aria-label={`Move ${seat.name} to ${TEAMS[other(seat.team)].name}`}
              onClick={() => move(other(seat.team!))}
            >
              {seat.team === 0 ? "To Blue" : "To Red"}
            </button>
            <button type="button" className="fifa-move fifa-move--bench" aria-label={`Take ${seat.name} off the team`} onClick={() => move(null)}>
              Bench
            </button>
          </>
        )}
      </span>
    </li>
  );
}

function TeamColumn({ team }: { team: TeamId }) {
  const seats = useFifaStore((s) => s.seats);
  const bots = useFifaStore((s) => s.bots);
  const players = seats.filter((s) => s.connected && s.team === team);
  const counts = (t: TeamId) => seats.filter((s) => s.connected && s.team === t).length;
  const full = (t: TeamId) => counts(t) >= TEAM_SIZE;
  // The computer players who would fill the empty places if the match started now.
  const humansPlaying = seats.filter((s) => s.connected && s.ready && s.pick && s.team === team).length;
  const fillers = bots.filter((b) => b.team === team).slice(0, TEAM_SIZE - Math.max(players.length, humansPlaying));
  return (
    <section className="fifa-team" style={{ "--team": TEAMS[team].color } as React.CSSProperties} aria-label={`${TEAMS[team].name} team`}>
      <header className="fifa-team__head">
        <span className="fifa-team__badge">{TEAMS[team].code}</span>
        <h2>{TEAMS[team].name}</h2>
        <span className="fifa-team__count">{players.length} of 3</span>
      </header>
      <ul className="fifa-team__list">
        {players.map((seat) => (
          <PlayerCard key={seat.seat} seat={seat} full={full} />
        ))}
        {fillers.map((bot) => (
          <li key={bot.character} className="fifa-card fifa-card--bot">
            <span className="fifa-card__cpu">CPU</span>
            <span className="fifa-card__who">
              <strong>{ROSTER[bot.character].name}</strong>
              <span>Computer player</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The lobby on the big screen: players pick their star on their phones,
 * and here the host puts them on a side with the mouse. Empty places are
 * filled by computer players. Start when everyone is ready.
 */
export function Lobby() {
  const session = useSession();
  const seats = useFifaStore((s) => s.seats);
  const joined = seats.filter((s) => s.connected);
  const bench = joined.filter((s) => s.team === null);
  const playing = joined.filter((s) => s.ready && s.pick && s.team !== null).length;
  const waiting = joined.filter((s) => !s.ready).length;
  const full = (team: TeamId) => joined.filter((s) => s.team === team).length >= TEAM_SIZE;
  const note =
    joined.length === 0
      ? "Scan the code with your phone to join. Up to six players."
      : playing === 0
        ? "Pick a star on your phone, then tap Ready."
        : waiting > 0
          ? `${playing} ready. ${waiting} still choosing.`
          : `${playing} ready. Computers fill the empty places.`;
  return (
    <div className="fifa-lobby">
      <header className="fifa-lobby__title">
        <span className="fifa-lobby__logo">
          FIFA <em>3v3</em>
        </span>
        <p>Three a side under the lights. First to five goals or four minutes, golden goal if level.</p>
      </header>
      <div className="fifa-lobby__teams">
        <TeamColumn team={0} />
        <span className="fifa-lobby__vs">VS</span>
        <TeamColumn team={1} />
      </div>
      {bench.length > 0 && (
        <section className="fifa-bench" aria-label="Not on a team yet">
          <h3>Not on a team yet</h3>
          <ul>
            {bench.map((seat) => (
              <PlayerCard key={seat.seat} seat={seat} full={full} />
            ))}
          </ul>
        </section>
      )}
      <footer className="fifa-lobby__foot">
        <p className="fifa-lobby__note">{note}</p>
        <button type="button" className="fifa-start" disabled={playing === 0} onClick={() => session.startMatch()}>
          <Icon name="play" />
          Kick off
        </button>
      </footer>
    </div>
  );
}
