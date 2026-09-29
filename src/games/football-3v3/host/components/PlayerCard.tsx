"use client";
import { playerColor } from "@/games/kit/players";
import { ROLE_NAMES, ROLE_SHORT, ROLES, type LobbyRole } from "../../roles";
import { BUILDS } from "../../builds";
import { TEAMS, other, type TeamId } from "../../teams";
import type { SeatView } from "../host-store";
import { useSession } from "./session-context";

/** QB or runner: two chips on a player's card. Picking QB swaps the side's old QB to runner. */
function RolePicker({ seat }: { seat: SeatView }) {
  const session = useSession();
  const pick = (role: LobbyRole) => session.setRole(seat.seat, role);
  return (
    <span className="fb-roles" role="group" aria-label={`Role for ${seat.name}`}>
      {ROLES.map((r) => (
        <button key={r} type="button" className="fb-role" aria-pressed={r === seat.role} aria-label={`${seat.name} plays ${ROLE_NAMES[r]}`} title={ROLE_NAMES[r]} onClick={() => pick(r)}>
          {ROLE_SHORT[r]}
        </button>
      ))}
    </span>
  );
}

/**
 * One person in the lobby: their name in their colour, the build they
 * picked on their phone, whether they are ready, their role, and the
 * buttons the host uses to move them between the sides and the bench.
 */
export function PlayerCard({ seat, full }: { seat: SeatView; full: (team: TeamId) => boolean }) {
  const session = useSession();
  const build = seat.pick ? BUILDS[seat.pick] : null;
  const move = (team: TeamId | null) => session.setTeam(seat.seat, team);
  return (
    <li className={`fb-card ${seat.ready ? "fb-card--ready" : ""}`} style={{ "--player": playerColor(seat.seat) } as React.CSSProperties}>
      <span className="fb-card__dot" />
      <span className="fb-card__who">
        <strong>{seat.name}</strong>
        <span>{build ? `${build.name}, ${build.number}` : "Choosing a build"}</span>
      </span>
      <span className={`fb-card__state ${seat.ready ? "fb-card__state--on" : ""}`}>{seat.ready ? "Ready" : "Setting up"}</span>
      <span className="fb-card__moves">
        {seat.team !== null && <RolePicker seat={seat} />}
        {seat.team === null ? (
          ([0, 1] as const).map((team) => (
            <button key={team} type="button" className="fb-move" style={{ "--team": TEAMS[team].color } as React.CSSProperties} disabled={full(team)} onClick={() => move(team)}>
              {TEAMS[team].name}
            </button>
          ))
        ) : (
          <>
            <button
              type="button"
              className="fb-move"
              style={{ "--team": TEAMS[other(seat.team)].color } as React.CSSProperties}
              disabled={full(other(seat.team))}
              aria-label={`Move ${seat.name} to ${TEAMS[other(seat.team)].name}`}
              onClick={() => move(other(seat.team!))}
            >
              To {TEAMS[other(seat.team)].name}
            </button>
            <button type="button" className="fb-move fb-move--bench" aria-label={`Take ${seat.name} off the team`} onClick={() => move(null)}>
              Bench
            </button>
          </>
        )}
      </span>
    </li>
  );
}
