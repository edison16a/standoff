"use client";
import type { ViewRect } from "../../render/views";
import type { Hud, HudFighter } from "../host-store";

interface ViewHudProps {
  hud: Hud;
  me: 0 | 1;
  rect: ViewRect;
  /** One wide broadcast picture that both players share, as during the breaks. */
  shared: boolean;
}

/**
 * One view's overlay: health bars along its top, its own boxer on the
 * left and the opponent on the right, with the stamina under a player's
 * bar, a tag while stunned or hurt, and a glow when a counter is on.
 */
export function ViewHud({ hud, me, rect, shared }: ViewHudProps) {
  const mine = hud.fighters[me];
  const them = me === 0 ? 1 : 0;
  const theirs = hud.fighters[them];
  const two = hud.views.length === 2;
  const banners = hud.banners.filter((b) => shared || b.fighter === null || b.fighter === me);
  const side = rect.w >= 1 ? "full" : rect.x === 0 ? "left" : "right";
  return (
    <div className={`bx-view bx-view--${side}`} style={{ left: `${rect.x * 100}%`, width: `${rect.w * 100}%` }}>
      {mine.hurt > 0 && hud.stage === "fight" && !shared && <div key={mine.hurt} className="bx-hurt" />}
      {hud.stage === "fight" && (
        <div className="bx-bars">
          <Bar fighter={mine} stamina label={two ? `Player ${me + 1}` : "You"} />
          <Bar fighter={theirs} them stamina={shared && theirs.human} label={theirs.human ? `Player ${them + 1}` : "Computer"} />
        </div>
      )}
      {mine.counter && hud.stage === "fight" && !shared && <div className="bx-counter">Counter now: left jab!</div>}
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

function Bar({ fighter, them, stamina, label }: { fighter: HudFighter; them?: boolean; stamina: boolean; label: string }) {
  const low = fighter.health <= 25;
  return (
    <div className={`bx-bar${them ? " bx-bar--them" : " bx-bar--own"}`}>
      <div className="bx-bar__name">
        <span className="bx-bar__who">{label}</span>
        <span>{fighter.name}</span>
        {fighter.knockdowns > 0 && <span className="bx-bar__downs">{"KD ".repeat(fighter.knockdowns).trim()}</span>}
        {fighter.stunned && <span className="bx-bar__tag bx-bar__tag--stun">Stunned</span>}
        {!fighter.stunned && fighter.worn && <span className="bx-bar__tag">Hurt</span>}
      </div>
      <div className={`bx-bar__track${low ? " bx-bar__track--low" : ""}`}>
        <span className="bx-bar__fill" style={{ width: `${fighter.health}%`, ["--glove" as string]: fighter.colour }} />
      </div>
      {stamina && (
        <div className="bx-bar__stamina">
          <span style={{ width: `${fighter.stamina}%` }} />
        </div>
      )}
    </div>
  );
}
