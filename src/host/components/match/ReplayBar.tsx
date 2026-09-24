import { Icon } from "@/components/ui/Icon";
import { useHostStore } from "../../host-store";

/** Shown during a replay: what we are watching, how far in, and who has skipped. */
export function ReplayBar() {
  const hud = useHostStore((state) => state.hud);
  if (!hud || hud.phase !== "replay" || !hud.replay) return null;
  const votes = Number(hud.skipVotes[1]) + Number(hud.skipVotes[2]);
  return (
    <div className="replay card" role="status">
      <div className="replay__head">
        <strong>Replay</strong>
        {hud.call && <span className="muted">{hud.call}</span>}
        {hud.replay.slow && <span className="pill pill--accent">Slow motion</span>}
      </div>
      <div className="replay__track">
        <span className="replay__fill" style={{ width: `${hud.replay.percent}%` }} />
      </div>
      <span className="muted replay__votes">
        <Icon name="skip" size={14} />
        {votes} of 2 skipped
      </span>
    </div>
  );
}
