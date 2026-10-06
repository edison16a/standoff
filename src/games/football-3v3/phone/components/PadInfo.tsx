"use client";
import { ROLE_NAMES } from "../../roles";
import { TEAMS } from "../../teams";
import type { PhoneState } from "../../protocol";

/** The QB with the ball who has not turned runner: what he can do right now. */
function qbStatus(host: PhoneState): string {
  if (host.canPitch) return "Press Pass to pitch";
  if (host.canThrow) return "Find a receiver";
  // A run call whose back went down leaves only Run.
  if (host.canRun) return "Press Run to keep it";
  // Mid throw or mid pitch: the ball is about to leave his hand.
  return host.runPlay ? "Pitching" : "Throwing";
}

/** What is happening, in a few words, for the status line. */
export function statusOf(host: PhoneState): string | null {
  if (host.skip) return `Replay. Skip: ${host.skip.count} of ${host.skip.total}`;
  if (host.banner) return host.banner;
  if (host.grounded) return "Getting up";
  if (host.withBall && host.pad === "qb") return qbStatus(host);
  if (host.withBall) return "Run it in";
  if (host.switched && host.phase === "live") return host.runPlay ? "You have the back" : "You have the receiver";
  switch (host.phase) {
    case "choose":
    case "convert":
      return host.offense ? "The QB is calling the play" : "They are picking a play";
    case "presnap":
      return host.offense ? "Waiting for the snap" : "Line up. Rush at the snap";
    case "kick":
      return "Kick";
    case "dead":
      return "Back to the line";
    case "touchdown":
      return "Touchdown";
    case "replay":
      return "Replay";
    default:
      return null;
  }
}

/**
 * The middle of the controller: this player's side and role, and a
 * status line saying what to do. The score, the clock and the down are
 * left to the big screen, so the buttons get the room.
 */
export function PadInfo({ host }: { host: PhoneState }) {
  const team = host.team !== null ? TEAMS[host.team] : TEAMS[0];
  const status = statusOf(host);
  return (
    <div className="fb-info">
      <div className="fb-info__me">
        <span className="fb-info__team" style={{ background: team.color }}>
          {team.name}
        </span>
        {host.role && <span>{ROLE_NAMES[host.role]}</span>}
      </div>
      {status && <div className={`fb-info__status ${host.withBall ? "fb-info__status--ball" : ""}`}>{status}</div>}
    </div>
  );
}
