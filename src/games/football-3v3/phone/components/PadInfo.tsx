"use client";
import { ROLE_NAMES } from "../../roles";
import { BUILDS } from "../../builds";
import { TEAMS } from "../../teams";
import type { PhoneState } from "../../protocol";

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** What is happening, in a few words, for the status line. */
export function statusOf(host: PhoneState): string | null {
  if (host.skip) return `Replay. Skip: ${host.skip.count} of ${host.skip.total}`;
  if (host.banner) return host.banner;
  if (host.grounded) return "Getting up";
  if (host.withBall) return host.canThrow ? "Find a receiver" : "Run it in";
  switch (host.phase) {
    case "choose":
    case "convert":
      return host.offense ? "The QB is calling the play" : "They are picking a play. Set up";
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
 * The middle of the controller: the score, the quarter and clock, the
 * down and distance, this player's side and role, and a status line.
 */
export function PadInfo({ host }: { host: PhoneState }) {
  const team = host.team !== null ? TEAMS[host.team] : TEAMS[0];
  const build = host.pick ? BUILDS[host.pick] : null;
  const status = statusOf(host);
  return (
    <div className="fb-info">
      <div className="fb-info__score" aria-label={`${TEAMS[0].name} ${host.score[0]}, ${TEAMS[1].name} ${host.score[1]}`}>
        <span style={{ color: TEAMS[0].color }}>{TEAMS[0].code}</span>
        <strong>
          {host.score[0]} : {host.score[1]}
        </strong>
        <span style={{ color: TEAMS[1].color }}>{TEAMS[1].code}</span>
      </div>
      <div className="fb-info__clock">
        {host.overtime ? "OT" : `Q${host.quarter}`} {clock(host.clock)}
        {host.down && <span>{host.down}</span>}
      </div>
      <div className="fb-info__me">
        <span className="fb-info__team" style={{ background: team.color }}>
          {team.name}
        </span>
        {build && <span>{build.short}</span>}
        {host.role && <span>{ROLE_NAMES[host.role]}</span>}
      </div>
      {status && <div className={`fb-info__status ${host.withBall ? "fb-info__status--ball" : ""}`}>{status}</div>}
    </div>
  );
}
