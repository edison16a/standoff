"use client";
import { ordinal } from "../../ui/format";
import { useEffect, useState } from "react";
import { useControllerStore } from "../controller-store";
import { DrivePad } from "./DrivePad";
import { Setup } from "./Setup";


function usePortrait(): boolean {
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const check = () => setPortrait(window.innerHeight > window.innerWidth);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return portrait;
}

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
            <span>Hold it flat like a steering wheel.</span>
          </div>
        )}
      </div>
    );
  }

  if (host && racing && host.phase === "results") {
    const place = host.place ? ordinal(host.place) : null;
    return (
      <div className="mk-phone mk-result">
        <span className="mk-result__label">You finished</span>
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
