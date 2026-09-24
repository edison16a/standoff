"use client";
import { StepShell } from "@/games/kit/steps/StepShell";
import { Icon } from "@/components/ui/Icon";
import type { GalleryState } from "../../protocol";
import { usePhone, usePhoneState } from "./session-context";
import { STEPS } from "./steps";

/** A line under the button about what happens next. */
function waitingLine(game: GalleryState | null, seat: number, ready: boolean): string {
  if (!game) return "";
  const me = game.players.find((p) => p.seat === seat);
  if (game.phase !== "lobby" && !me?.inRound) return "A round is on. You are in the next one.";
  if (!ready) return "Tap Ready when you are set. The round starts once everyone is.";
  const others = game.players.filter((p) => p.seat !== seat && p.connected && !p.ready).length;
  return others === 0 ? "Starting" : `Waiting for ${others} more ${others === 1 ? "player" : "players"}, or for Start on the computer.`;
}

/** Step three: ready up, or go back and change something. */
export function ReadyStep() {
  const session = usePhone();
  const ready = usePhoneState((state) => state.ready);
  const game = usePhoneState((state) => state.game);
  const seconds = game?.seconds ?? 20;
  return (
    <StepShell
      steps={STEPS}
      current={2}
      title={ready ? "You are ready" : "Ready to shoot?"}
      footer={
        <>
          <button type="button" className="btn btn--ghost btn--lg" onClick={() => session.goTo("gun")}>
            Gun
          </button>
          <button type="button" className="btn btn--ghost btn--lg" onClick={() => session.goTo("calibrate")}>
            Recalibrate
          </button>
        </>
      }
    >
      <p className="sg-ready__rules">
        {seconds} seconds on the clock. Point at a duck or a target and tap Shoot. Small and fast ones are worth more.
      </p>
      <button type="button" className={`sg-ready ${ready ? "sg-ready--on" : ""}`} aria-pressed={ready} onClick={() => session.setReady(!ready)}>
        <Icon name={ready ? "check" : "target"} size={34} />
        {ready ? "Ready" : "I am ready"}
      </button>
      <p className="sg-ready__wait muted">{waitingLine(game, session.seat, ready)}</p>
    </StepShell>
  );
}
