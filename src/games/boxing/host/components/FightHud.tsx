"use client";
import { useBoxingStore, type Hud, type HudFighter } from "../host-store";
import { useSession } from "./session-context";

/**
 * The overlay on the fight. Each view gets health bars along its top,
 * its own boxer on the left and the opponent on the right, with the
 * stamina under yours and a glow when a counter is on. The clock sits in
 * the middle, and the count, the pause and the replay take the whole
 * screen when they come.
 */
export function FightHud() {
  const hud = useBoxingStore((state) => state.hud);
  const session = useSession();
  if (!hud) return null;
  const split = hud.views.length === 2 && hud.stage === "fight";
  return (
    <div className={`bx-hud${split ? " bx-hud--split" : ""}`}>
      {hud.views.map((id) => (
        <ViewHud key={id} hud={hud} me={id} split={split} />
      ))}
      {hud.stage === "fight" && (
        <div className="bx-clock">
          <span className="bx-clock__round">
            Round {hud.round} of {hud.rounds}
          </span>
          <span className="bx-clock__time">{formatClock(hud.clock)}</span>
        </div>
      )}
      {hud.stage === "fight" && (hud.phase === "intro" || hud.phase === "break") && (
        <div className="bx-callout">
          <span className="bx-callout__small">{hud.phase === "intro" ? "Get your guard up" : `Round ${hud.round + 1} in`}</span>
          {hud.phase === "break" && <span className="bx-callout__big">{hud.phaseLeft}</span>}
        </div>
      )}
      {hud.count && (
        <div className="bx-count" key={hud.count.n}>
          <span className="bx-count__n">{hud.count.n}</span>
          {!hud.count.rising && hud.fighters[hud.count.fighter].human && <span className="bx-count__hint">Raise both gloves to get up!</span>}
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

function ViewHud({ hud, me, split }: { hud: Hud; me: 0 | 1; split: boolean }) {
  const mine = hud.fighters[me];
  const theirs = hud.fighters[me === 0 ? 1 : 0];
  const banners = hud.banners.filter((b) => b.fighter === null || b.fighter === me);
  const left = split ? (me === 0 ? "0%" : "50%") : "0%";
  return (
    <div className={`bx-view bx-view--${split ? (me === 0 ? "left" : "right") : "full"}`} style={{ left, width: split ? "50%" : "100%" }}>
      {mine.hurt > 0 && hud.stage === "fight" && <div key={mine.hurt} className="bx-hurt" />}
      {hud.stage === "fight" && (
        <div className="bx-bars">
          <Bar fighter={mine} own label={split ? `Player ${me + 1}` : "You"} />
          <Bar fighter={theirs} label={theirs.human ? `Player ${me === 0 ? 2 : 1}` : "Computer"} />
        </div>
      )}
      {mine.counter && hud.stage === "fight" && <div className="bx-counter">Counter now: left jab!</div>}
      <div className="bx-banners">
        {banners.map((b) => (
          <span key={b.id} className={`bx-banner bx-banner--${b.tone}`}>
            {b.text}
          </span>
        ))}
      </div>
    </div>
  );
}

function Bar({ fighter, own, label }: { fighter: HudFighter; own?: boolean; label: string }) {
  const low = fighter.health <= 25;
  return (
    <div className={`bx-bar${own ? " bx-bar--own" : " bx-bar--them"}`}>
      <div className="bx-bar__name">
        <span className="bx-bar__who">{label}</span>
        <span>{fighter.name}</span>
        {fighter.knockdowns > 0 && <span className="bx-bar__downs">{"KD ".repeat(fighter.knockdowns).trim()}</span>}
      </div>
      <div className={`bx-bar__track${low ? " bx-bar__track--low" : ""}`}>
        <span className="bx-bar__fill" style={{ width: `${fighter.health}%`, ["--glove" as string]: fighter.colour }} />
      </div>
      {own && (
        <div className="bx-bar__stamina">
          <span style={{ width: `${fighter.stamina}%` }} />
        </div>
      )}
    </div>
  );
}

function formatClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
