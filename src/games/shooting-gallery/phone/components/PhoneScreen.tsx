"use client";
import { PlayPad } from "./PlayPad";
import { RoundResults } from "./RoundResults";
import { SetupSteps } from "./SetupSteps";
import { useAimSnapshot, usePhone, usePhoneState } from "./session-context";

/**
 * Shooting Gallery on the phone. Setup first, one page per step. Once a
 * round starts, players in it get the Shoot button, and afterwards their
 * result. Anyone who joined late keeps their setup pages until the next
 * round.
 */
export function PhoneScreen() {
  const session = usePhone();
  const game = usePhoneState((state) => state.game);
  const step = usePhoneState((state) => state.step);
  const leftResults = usePhoneState((state) => state.leftResults);
  const { calibrated } = useAimSnapshot();
  if (!game) return <p className="muted phone__waiting">Connecting to the booth</p>;
  const me = game.players.find((p) => p.seat === session.seat);
  const playing = game.phase === "countdown" || game.phase === "playing";
  // A phone that reloaded mid round has to calibrate again before it can shoot.
  if (playing && me?.inRound && calibrated && step !== "calibrate") return <PlayPad />;
  if (game.phase === "results" && me?.inRound && !leftResults) return <RoundResults />;
  return <SetupSteps />;
}
