"use client";
import { phonePage, useControllerStore } from "../controller-store";
import { LobbySteps, STEPS } from "./LobbySteps";
import { MatchPad } from "./MatchPad";
import { CalibrateStep } from "./setup/CalibrateStep";

const noop = () => undefined;

/** Blade Clash on the phone: calibrate and pick in the lobby, then fight. */
export function PhoneScreen() {
  const { slot, game } = useControllerStore();
  const page = useControllerStore(phonePage);
  if (!slot) return null;
  if (page === "match" && game) return <MatchPad slot={slot} game={game} />;
  return (
    <div className="blade-setup">
      {/* Once calibrated the page turns into the match by itself, so nothing waits on Done. */}
      {page === "calibrate" ? <CalibrateStep slot={slot} steps={STEPS} onDone={noop} /> : <LobbySteps slot={slot} />}
    </div>
  );
}
