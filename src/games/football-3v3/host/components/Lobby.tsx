"use client";
import { Icon } from "@/components/ui/Icon";
import { DifficultyPicker } from "@/games/kit/difficulty/DifficultyPicker";
import { RULES } from "../../engine/tuning";
import { ROLE_NAMES } from "../../roles";
import { BUILDS, computerName } from "../../builds";
import { TEAMS, type TeamId } from "../../teams";
import { useFootballStore, type SeatView } from "../host-store";
import { TEAM_SIZE } from "../lobby";
import { PlayerCard } from "./PlayerCard";
import { useSession } from "./session-context";

/** One side: its people with their roles, then the computer players who would fill the rest. */
function TeamColumn({ team, full }: { team: TeamId; full: (team: TeamId) => boolean }) {
  const seats = useFootballStore((s) => s.seats);
  const bots = useFootballStore((s) => s.bots);
  const players = seats.filter((s) => s.connected && s.team === team);
  // The computer players who would fill the empty places once everyone here is ready: a side with people has a person at QB.
  const fillers = bots.filter((b) => b.team === team && !(players.length > 0 && b.role === "qb")).slice(0, Math.max(0, TEAM_SIZE - players.length));
  return (
    <section className="fb-team" style={{ "--team": TEAMS[team].color } as React.CSSProperties} aria-label={`${TEAMS[team].name} team`}>
      <header className="fb-team__head">
        <span className="fb-team__badge">{TEAMS[team].code}</span>
        <h2>{TEAMS[team].name}</h2>
        <span className="fb-team__count">
          {players.length} of {TEAM_SIZE}
        </span>
      </header>
      <ul className="fb-team__list">
        {players.map((seat) => (
          <PlayerCard key={seat.seat} seat={seat} full={full} />
        ))}
        {fillers.map((bot) => (
          <li key={bot.build} className="fb-card fb-card--bot">
            <span className="fb-card__cpu">CPU</span>
            <span className="fb-card__who">
              <strong>{computerName(bot.build)}</strong>
              <span>{BUILDS[bot.build].name}, {ROLE_NAMES[bot.role].toLowerCase()}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function noteFor(joined: SeatView[]): string {
  const playing = joined.filter((s) => s.ready && s.pick && s.team !== null).length;
  const waiting = joined.filter((s) => !s.ready).length;
  if (joined.length === 0) return "Scan the code with your phone to join. Up to six players.";
  if (playing === 0) return "Pick a build on your phone, then tap Ready.";
  if (waiting > 0) return `${playing} ready. ${waiting} still choosing.`;
  return `${playing} ready. Computers fill the empty places.`;
}

/**
 * The lobby on the big screen: players pick their build on their phones,
 * and here the host puts them on a side, picks each side's QB, and sets
 * how sharp the computer players are. Kick off when everyone is ready.
 */
export function Lobby() {
  const session = useSession();
  const seats = useFootballStore((s) => s.seats);
  const level = useFootballStore((s) => s.level);
  const block = useFootballStore((s) => s.startBlock);
  const joined = seats.filter((s) => s.connected);
  const bench = joined.filter((s) => s.team === null);
  const full = (team: TeamId) => joined.filter((s) => s.team === team).length >= TEAM_SIZE;
  return (
    <div className="fb-lobby">
      <header className="fb-lobby__title">
        <span className="fb-lobby__logo">
          FOOTBALL <em>3v3</em>
        </span>
        <p>
          A QB and two runners a side under the lights. First to {RULES.target}, or the lead after four quarters.
        </p>
      </header>
      <div className="fb-lobby__teams">
        <TeamColumn team={0} full={full} />
        <span className="fb-lobby__vs">VS</span>
        <TeamColumn team={1} full={full} />
      </div>
      {bench.length > 0 && (
        <section className="fb-bench" aria-label="Not on a team yet">
          <h3>Not on a team yet</h3>
          <ul>
            {bench.map((seat) => (
              <PlayerCard key={seat.seat} seat={seat} full={full} />
            ))}
          </ul>
        </section>
      )}
      <footer className="fb-lobby__foot">
        <p className="fb-lobby__note">{noteFor(joined)}</p>
        <DifficultyPicker level={level} onChange={(next) => session.setLevel(next)} />
        <button type="button" className="fb-start" disabled={block !== null} onClick={() => session.startGame()}>
          <Icon name="play" />
          Kick off
        </button>
      </footer>
    </div>
  );
}
