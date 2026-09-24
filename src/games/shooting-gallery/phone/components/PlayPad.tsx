"use client";
import { AimPad } from "@/games/kit/aim/AimPad";
import { FireButton } from "@/games/kit/aim/FireButton";
import { playerColor } from "@/games/kit/players";
import { Icon } from "@/components/ui/Icon";
import { useAimSnapshot, usePhone, usePhoneState } from "./session-context";

/**
 * The phone during a round. Eyes are on the big screen, so it is mostly
 * one huge Shoot button, with the score, the clock and a small recenter
 * button for when the aim drifts. Phones without sensors aim by dragging
 * round the button.
 */
export function PlayPad() {
  const session = usePhone();
  const game = usePhoneState((state) => state.game);
  const pumping = usePhoneState((state) => state.pumping);
  const scored = usePhoneState((state) => state.scored);
  const { source } = useAimSnapshot();
  if (!game) return null;
  const me = game.players.find((p) => p.seat === session.seat);
  const counting = game.phase === "countdown";
  const colour = playerColor(session.seat);

  const fire = (
    <FireButton label="Shoot" disabled={counting || pumping} onFire={() => session.fire()}>
      <span className="sg-shoot">{counting ? game.countdown : pumping ? "Pump" : "Shoot"}</span>
    </FireButton>
  );

  return (
    <div className="sg-pad" style={{ "--p": colour } as React.CSSProperties}>
      <header className="sg-pad__top">
        <div className="sg-pad__stat">
          <span className="sg-pad__label">Score</span>
          <strong className="sg-pad__value">{me?.score ?? 0}</strong>
        </div>
        <div className="sg-pad__stat">
          <span className="sg-pad__label">Time</span>
          <strong className="sg-pad__value">{counting ? game.seconds : game.timeLeft}</strong>
        </div>
        {source === "motion" && (
          <button type="button" className="sg-pad__recenter" onClick={() => session.recenter()} aria-label="Recenter your aim">
            <Icon name="target" />
            Recenter
          </button>
        )}
      </header>
      <div className="sg-pad__middle">
        {source === "touch" ? <AimPad aim={session.aim}>{fire}</AimPad> : fire}
        {scored && (
          <span key={scored.at} className="sg-pad__flash" aria-live="polite">
            +{scored.points}
          </span>
        )}
      </div>
      <p className="sg-pad__hint muted">
        {source === "touch" ? "Drag round the button to aim." : "Point your phone at the screen. Hold still, then shoot."}
      </p>
    </div>
  );
}
