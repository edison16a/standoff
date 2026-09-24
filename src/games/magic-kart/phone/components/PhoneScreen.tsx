"use client";
import { ordinal } from "../../ui/format";
import { useControllerStore } from "../controller-store";
import { usePortrait } from "../use-portrait";
import { DrivePad } from "./DrivePad";
import { Setup } from "./Setup";

/**
 * Magic Kart on the phone: the setup steps, then the wheel and pedals
 * while this phone has a kart in the race, then the result. A phone that
 * joined mid race stays in setup until the next one.
 */
export function PhoneScreen() {
  const host = useControllerStore((state) => state.host);
  const portrait = usePortrait();
  const racing = host?.racing ?? false;

  if (host && racing && (host.phase === "countdown" || host.phase === "racing")) {
    return (
      <div className="mk-phone mk-phone--drive">
        <DrivePad host={host} />
        {portrait && (
          <div className="mk-turn">
            <strong>Turn your phone sideways</strong>
            <span>Hold it upright like a steering wheel, screen facing you.</span>
          </div>
        )}
      </div>
    );
  }

  if (host && racing && host.phase === "results") {
    const place = host.place ? ordinal(host.place) : null;
    return (
      <div className="mk-phone mk-result">
        <span className="mk-result__label">{host.finished ? "You finished" : "Race over"}</span>
        <strong className="mk-result__place">{place ?? "Home"}</strong>
        <span className="muted">Race again or pick a new map on the big screen.</span>
      </div>
    );
  }

  return (
    <div className="mk-phone">
      <Setup />
    </div>
  );
}
