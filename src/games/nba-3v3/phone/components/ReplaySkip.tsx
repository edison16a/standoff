"use client";
import type { PhoneState } from "../../protocol";
import { TEAMS } from "../../roster";
import { useController } from "./session-context";

/**
 * The phone during the replay of the winning basket: one big Skip
 * button, and who has pressed theirs. The replay only stops once
 * everyone in the game has.
 */
export function ReplaySkip({ replay, team }: { replay: NonNullable<PhoneState["replay"]>; team: 0 | 1 | null }) {
  const session = useController();
  const agreed = replay.votes.filter((v) => v.done).length;
  return (
    <div className="nba-phone nba-skip" style={{ "--team": team === null ? undefined : TEAMS[team].color } as React.CSSProperties}>
      <strong>Replay of the winning basket</strong>
      <button type="button" className="nba-skip__button" disabled={replay.voted} onClick={() => session.skipReplay()}>
        {replay.voted ? "Waiting" : "Skip"}
      </button>
      <span className="muted">
        Skips when everyone presses. {agreed} of {replay.votes.length} agreed
      </span>
      <ul className="nba-skip__votes">
        {replay.votes.map((v, i) => (
          <li key={i} className={v.done ? "is-done" : ""}>
            {v.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
