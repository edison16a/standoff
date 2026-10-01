"use client";
import { useEffect, useRef } from "react";
import { phonePage, useControllerStore } from "../controller-store";
import { LobbySteps, STEPS } from "./LobbySteps";
import { MatchPad } from "./MatchPad";
import { useController } from "./session-context";
import { CalibrateStep } from "./setup/CalibrateStep";

const noop = () => undefined;

/** Blade Clash on the phone: calibrate and pick in the lobby, then fight. */
export function PhoneScreen() {
  const { slot, game } = useControllerStore();
  const page = useControllerStore(phonePage);
  const session = useController();
  const aimedAgain = useRef(false);
  // The page leaves calibration before its Done, so tell the big screen to take this player's target down.
  useEffect(() => {
    if (page === "calibrate") aimedAgain.current = true;
    else if (aimedAgain.current) {
      aimedAgain.current = false;
      session.showStep("done");
    }
  }, [page, session]);
  if (!slot) return null;
  if (page === "match" && game) return <MatchPad slot={slot} game={game} />;
  return (
    <div className="blade-setup">
      {/* Once calibrated the page turns into the match by itself, so nothing waits on Done. */}
      {page === "calibrate" ? <CalibrateStep slot={slot} steps={STEPS} onDone={noop} /> : <LobbySteps slot={slot} />}
    </div>
  );
}
