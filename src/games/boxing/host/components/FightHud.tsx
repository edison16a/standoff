"use client";
import { FULL, type OwnView } from "../../render/views";
import { useBoxingStore } from "../host-store";
import { PlayerMap } from "./PlayerMap";
import { RoundCallout } from "./RoundCallout";
import { useSession } from "./session-context";
import { ViewHud } from "./ViewHud";

/**
 * The overlay on the fight. Each view gets health bars along its top,
 * laid out on the very rects the picture is drawn in. While the
 * broadcast camera has the whole screen one set of bars spans it. The
 * clock sits in the middle, the prompts between rounds under it, and the
 * count, the pause and the replay take the whole screen when they come.
 */
export function FightHud() {
  const hud = useBoxingStore((state) => state.hud);
  const session = useSession();
  if (!hud) return null;
  const split = hud.panes.length === 2;
  const first = hud.views[0];
  const shown: OwnView[] = hud.panes.length > 0 ? hud.panes : first !== undefined ? [{ id: first, rect: FULL }] : [];
  return (
    <div className={`bx-hud${split ? " bx-hud--split" : ""}`}>
      {shown.map((pane) => (
        <ViewHud key={pane.id} hud={hud} me={pane.id} rect={pane.rect} shared={hud.panes.length === 0} />
      ))}
      {hud.stage === "fight" && (
        <div className="bx-clock">
          <span className="bx-clock__round">
            Round {hud.round} of {hud.rounds}
          </span>
          <span className="bx-clock__time">{formatClock(hud.clock)}</span>
        </div>
      )}
      {split && <PlayerMap panes={hud.panes} />}
      <RoundCallout hud={hud} />
      {hud.count && (
        <div className="bx-count" key={hud.count.n}>
          <span className="bx-count__n">{hud.count.n}</span>
          {!hud.count.rising && hud.fighters[hud.count.fighter].human && <span className="bx-count__hint">Drop your gloves, then raise both to get up!</span>}
        </div>
      )}
      {hud.away.length > 0 && (
        <div className="bx-paused" role="alert">
          <span className="bx-paused__title">Paused</span>
          <span className="bx-paused__text">
            {hud.away.length === 2 ? "Both players, step back into view" : `Player ${hud.away[0]}, step back into view`}
          </span>
        </div>
      )}
      {hud.away.length === 0 && hud.resumeIn !== null && (
        <div className="bx-paused">
          <span className="bx-paused__title">Back in</span>
          <span className="bx-paused__big">{Math.ceil(hud.resumeIn)}</span>
        </div>
      )}
      {hud.stage === "replay" && <div className="bx-letterbox" />}
      {hud.stage === "replay" && (
        <div className="bx-replay">
          <span className="bx-replay__tag">Replay</span>
          <button type="button" className="bx-link" onClick={() => session.skip()}>
            Skip
          </button>
        </div>
      )}
    </div>
  );
}

function formatClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
