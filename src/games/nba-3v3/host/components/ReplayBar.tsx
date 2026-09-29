"use client";
import { Icon } from "@/components/ui/Icon";
import { useNbaStore } from "../host-store";

/**
 * Over the replay of the winning basket: a broadcast style replay bug,
 * whose view it is, and the skip vote. Every player has a chip that
 * lights up once they have pressed a button; the replay is skipped when
 * all of them have.
 */
export function ReplayBar() {
  const replay = useNbaStore((s) => s.replay);
  if (!replay) return null;
  const agreed = replay.votes.filter((v) => v.done).length;
  return (
    <div className="nba-replay" aria-live="polite">
      <div className="nba-replay__bug">
        <span className="nba-replay__dot" aria-hidden="true" />
        <strong>Replay</strong>
        <span>{replay.view === "scorer" ? `${replay.scorer}'s view` : "The defender's view"}</span>
      </div>
      <div className="nba-replay__frame" aria-hidden="true" />
      {replay.votes.length > 0 && (
        <div className="nba-replay__skip">
          <span className="nba-replay__hint">
            Press any button to skip. {agreed} of {replay.votes.length} agreed
          </span>
          <ul className="nba-replay__votes">
            {replay.votes.map((v, i) => (
              <li key={i} className={v.done ? "is-done" : ""}>
                {v.done && <Icon name="check" />}
                {v.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
