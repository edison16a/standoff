import { useHostStore } from "../../host-store";

/** During a replay: a thin progress line, and one dot per player who skipped. */
export function ReplayBar() {
  const hud = useHostStore((state) => state.hud);
  if (!hud || hud.phase !== "replay" || !hud.replay) return null;
  return (
    <div className="replay" role="status">
      <span className="replay__label">{hud.replay.slow ? "Slow motion" : "Replay"}</span>
      <span className="replay__track">
        <span className="replay__fill" style={{ width: `${hud.replay.percent}%` }} />
      </span>
      <span className="replay__votes" aria-label="Skip votes">
        <span className={`dot ${hud.skipVotes[1] ? "dot--on" : ""}`} />
        <span className={`dot ${hud.skipVotes[2] ? "dot--on" : ""}`} />
      </span>
    </div>
  );
}
