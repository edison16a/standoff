"use client";
import { useEffect, useState } from "react";
import { usePhoneStore } from "../phone-store";
import { Controller, ResultCard } from "./Controller";
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
 * FIFA 3v3 on the phone: the setup steps, then the controller while
 * this phone has a player in the match, then the result. A phone that
 * joined mid match stays in setup until the next one.
 */
export function PhoneScreen() {
  const host = usePhoneStore((s) => s.host);
  const portrait = usePortrait();

  if (host?.playing && host.phase !== "lobby" && host.phase !== "fulltime") {
    return (
      <div className="fifa-phone fifa-phone--pad">
        <Controller host={host} />
        {portrait && (
          <div className="fifa-turn">
            <strong>Turn your phone sideways</strong>
            <span>Hold it like a controller: stick on the left, buttons on the right.</span>
          </div>
        )}
      </div>
    );
  }

  if (host?.playing && host.phase === "fulltime") {
    return (
      <div className="fifa-phone">
        <ResultCard host={host} />
      </div>
    );
  }

  return (
    <div className="fifa-phone">
      <Setup />
    </div>
  );
}
